"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChatInput } from "@/components/ChatInput";
import { MessageBubble, type ChatRole } from "@/components/MessageBubble";
import { RecoveryCodePill } from "@/components/RecoveryCodePill";
import { PaperSurface } from "@/components/marketing/PaperSurface";
import { apiUrl } from "@/lib/api";

interface ChatMsg {
  id: string;
  role: ChatRole;
  content: string;
  pending?: boolean;
}

const CODE_KEY = "vespers.code";

const PROMPTS = [
  "i've been feeling stretched thin lately.",
  "help me untangle what i'm feeling right now.",
  "i'm anxious about something and can't slow down.",
  "i just need someone to listen for a minute.",
];

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export default function Page() {
  const [code, setCode] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem(CODE_KEY) : null;
    if (saved) {
      setCode(saved);
      fetch(apiUrl(`/api/session?code=${encodeURIComponent(saved)}`))
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data?.ok && Array.isArray(data.messages)) {
            const restored: ChatMsg[] = data.messages.map(
              (m: { role: string; content: string }) => ({
                id: uid(),
                role: m.role === "model" ? "assistant" : "user",
                content: m.content,
              }),
            );
            setMessages(restored);
          }
        })
        .catch(() => {})
        .finally(() => setHydrated(true));
    } else {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, streaming]);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || streaming) return;

      const userMsg: ChatMsg = { id: uid(), role: "user", content: trimmed };
      const assistantMsg: ChatMsg = {
        id: uid(),
        role: "assistant",
        content: "",
        pending: true,
      };
      setMessages((m) => [...m, userMsg, assistantMsg]);
      setInput("");
      setStreaming(true);

      try {
        const res = await fetch(apiUrl("/api/chat"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: trimmed, code }),
        });

        const newCode = res.headers.get("X-Vespers-Code");
        if (newCode) {
          setCode(newCode);
          try {
            localStorage.setItem(CODE_KEY, newCode);
          } catch {
            /* storage unavailable */
          }
        }

        if (!res.ok || !res.body) {
          const errText = await res.text().catch(() => "Vespers could not respond.");
          setMessages((m) =>
            m.map((msg) =>
              msg.id === assistantMsg.id
                ? { ...msg, pending: false, content: errText }
                : msg,
            ),
          );
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let acc = "";
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          acc += decoder.decode(value, { stream: true });
          setMessages((m) =>
            m.map((msg) =>
              msg.id === assistantMsg.id
                ? { ...msg, pending: false, content: acc }
                : msg,
            ),
          );
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Something interrupted the connection.";
        setMessages((m) =>
          m.map((msg) =>
            msg.id === assistantMsg.id
              ? { ...msg, pending: false, content: `[${message}]` }
              : msg,
          ),
        );
      } finally {
        setStreaming(false);
      }
    },
    [code, streaming],
  );

  const handleUseCode = useCallback(async (newCode: string) => {
    setCode(newCode);
    try {
      localStorage.setItem(CODE_KEY, newCode);
    } catch {
      /* ignore */
    }
    try {
      const res = await fetch(apiUrl(`/api/session?code=${encodeURIComponent(newCode)}`));
      if (res.ok) {
        const data = await res.json();
        if (data?.ok && Array.isArray(data.messages)) {
          setMessages(
            data.messages.map((m: { role: string; content: string }) => ({
              id: uid(),
              role: m.role === "model" ? "assistant" : "user",
              content: m.content,
            })),
          );
          return;
        }
      }
      setMessages([]);
    } catch {
      setMessages([]);
    }
  }, []);

  const handleForget = useCallback(() => {
    setCode(null);
    setMessages([]);
    try {
      localStorage.removeItem(CODE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const empty = hydrated && messages.length === 0;

  return (
    <main className="relative min-h-dvh flex flex-col bg-paper text-ink">
      <PaperSurface />

      {/* Header — wordmark + recovery code */}
      <header className="sticky top-0 z-20 bg-paper/95 hairline-b">
        <div className="mx-auto max-w-[1240px] w-full px-6 sm:px-10 lg:px-16 py-5 sm:py-6 flex items-center justify-between gap-6">
          <div className="flex items-baseline gap-5 sm:gap-7 min-w-0">
            <a
              href="/"
              className="script text-[34px] sm:text-[40px] leading-none text-aubergine hover:text-violetInk transition-colors"
              aria-label="Vespers — back to landing"
            >
              Vespers
            </a>
            <span className="eyebrow hidden sm:inline">
              vol. ii &nbsp;·&nbsp; session
            </span>
          </div>
          <RecoveryCodePill
            code={code}
            onUseCode={handleUseCode}
            onForget={handleForget}
          />
        </div>
      </header>

      {/* Transcript scroller */}
      <div
        ref={scrollerRef}
        className="flex-1 overflow-y-auto px-6 sm:px-10 lg:px-16 pb-44"
      >
        <div className="mx-auto w-full max-w-[820px] pt-12 sm:pt-20">
          <AnimatePresence>
            {empty && (
              <motion.div
                key="empty"
                initial={{ opacity: 0, y: 12, filter: "blur(6px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                className="pb-10"
              >
                <div className="eyebrow mb-7">§ a quiet place</div>
                <h1 className="display text-[clamp(34px,5.6vw,72px)] leading-[1.04] tracking-[-0.02em] text-ink">
                  take a slow breath.
                  <br />
                  <span className="lowercase">what&rsquo;s been </span>
                  <span className="script text-aubergine align-baseline mx-1 text-[1.05em]">
                    weighing
                  </span>
                  <br className="hidden sm:block" />
                  <span className="lowercase">on you tonight?</span>
                </h1>
                <p className="text-margin text-[14.5px] sm:text-[15px] leading-[1.75] mt-9 max-w-md">
                  i&rsquo;m vespers. write what&rsquo;s true — even crooked, even
                  half-formed. you&rsquo;re anonymous; whatever you share stays
                  linked only to your private recovery code.
                </p>

                <div className="mt-14 sm:mt-16 hairline pt-3">
                  <div className="eyebrow mb-6">openings</div>
                  <ol className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 max-w-3xl">
                    {PROMPTS.map((p, i) => (
                      <li key={p} className="hairline">
                        <button
                          onClick={() => send(p)}
                          className="w-full text-left py-5 grid grid-cols-[44px_1fr] gap-x-4 group"
                        >
                          <span className="eyebrow tabular-nums text-margin/80 group-hover:text-aubergine transition-colors pt-[6px]">
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          <p className="display italic text-[16px] sm:text-[16.5px] leading-snug text-ink/90 group-hover:text-aubergine transition-colors">
                            &ldquo;{p}&rdquo;
                          </p>
                        </button>
                      </li>
                    ))}
                  </ol>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {messages.length > 0 && (
            <div className="hairline">
              {messages.map((m) => (
                <MessageBubble
                  key={m.id}
                  role={m.role}
                  content={m.content}
                  pending={m.pending}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Fixed input bar */}
      <div className="fixed bottom-0 left-0 right-0 z-20 pointer-events-none">
        <div className="h-16 bg-gradient-to-t from-paper to-transparent" />
        <div className="bg-paper hairline-t pointer-events-auto">
          <div className="mx-auto w-full max-w-[820px] px-6 sm:px-10 lg:px-16 py-5 sm:py-6">
            <ChatInput
              value={input}
              onChange={setInput}
              onSubmit={() => send(input)}
              disabled={streaming}
            />
            <div className="mt-3 eyebrow text-margin/80 text-center">
              vespers is a wellness companion · not a substitute for medical or
              emergency care
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
