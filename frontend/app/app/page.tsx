"use client";

import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChatInput } from "@/components/ChatInput";
import { MessageBubble, type ChatRole } from "@/components/MessageBubble";
import { RecoveryCodePill } from "@/components/RecoveryCodePill";
import { CrisisSupport } from "@/components/CrisisSupport";
import { ClosingRitual } from "@/components/ClosingRitual";
import { PaperSurface } from "@/components/marketing/PaperSurface";
import { apiUrl } from "@/lib/api";
import { useInactivity } from "@/lib/inactivity";
import { readRiskFromHeaders, type RiskAssessment } from "@/lib/risk";

interface ChatMsg {
  id: string;
  role: ChatRole;
  content: string;
  pending?: boolean;
}

const CODE_KEY = "vespers.code";
const CLOSING_SHOWN_KEY = "vespers.closing.lastShownTs";
const CLOSING_COOLDOWN_MS = 1000 * 60 * 60 * 6; // 6h between auto-prompts
const INACTIVITY_MS = 1000 * 60 * 10; // 10 min

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
  const [risk, setRisk] = useState<RiskAssessment | null>(null);
  const [closingOpen, setClosingOpen] = useState(false);

  const scrollerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);
  const isProgrammaticScrollRef = useRef(false);

  // Hydrate from saved recovery code.
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

  // Sticky-to-bottom scroll detection.
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const onScroll = () => {
      if (isProgrammaticScrollRef.current) {
        isProgrammaticScrollRef.current = false;
        return;
      }
      const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      stickToBottomRef.current = distanceFromBottom < 120;
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  // Pin to bottom on every content resize (streaming chunks).
  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    const content = contentRef.current;
    if (!scroller || !content) return;
    const pin = () => {
      if (!stickToBottomRef.current) return;
      isProgrammaticScrollRef.current = true;
      scroller.scrollTop = scroller.scrollHeight;
    };
    pin();
    const ro = new ResizeObserver(pin);
    ro.observe(content);
    return () => ro.disconnect();
  }, []);

  // Closing-ritual after 10 minutes of inactivity, when there's a real
  // conversation in flight and we haven't recently shown one.
  const closingEligible =
    hydrated &&
    !streaming &&
    !closingOpen &&
    messages.length >= 4; // at least one full back-and-forth

  const tryShowClosing = useCallback(() => {
    if (!closingEligible) return;
    let lastShown = 0;
    try {
      lastShown = Number(localStorage.getItem(CLOSING_SHOWN_KEY)) || 0;
    } catch {
      /* ignore */
    }
    if (Date.now() - lastShown < CLOSING_COOLDOWN_MS) return;
    setClosingOpen(true);
    try {
      localStorage.setItem(CLOSING_SHOWN_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
  }, [closingEligible]);

  const { bump } = useInactivity(closingEligible, INACTIVITY_MS, tryShowClosing);

  const onClosingSubmit = useCallback(
    async (entries: { carrying: string; releasing: string; intention: string }) => {
      if (!code) return;
      await fetch(apiUrl("/api/rituals/closing"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, ...entries }),
      }).catch(() => {});
    },
    [code],
  );

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
      stickToBottomRef.current = true;
      setMessages((m) => [...m, userMsg, assistantMsg]);
      setInput("");
      setStreaming(true);
      bump();

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

        // Risk assessment travels in headers — never in the streamed body.
        const incoming = readRiskFromHeaders(res.headers);
        if (incoming.showSupportBanner) {
          setRisk(incoming);
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
        bump();
      }
    },
    [bump, code, streaming],
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

  const handleStartNew = useCallback(() => {
    // Non-destructive: just walk away from this code on this device. The
    // session row stays on the server; the user can paste the old code back
    // any time to return to it.
    setCode(null);
    setMessages([]);
    setRisk(null);
    setInput("");
    try {
      localStorage.removeItem(CODE_KEY);
      localStorage.removeItem(CLOSING_SHOWN_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const handleForget = useCallback(async () => {
    const confirmed =
      typeof window === "undefined"
        ? true
        : window.confirm(
            "Forget this session permanently?\n\nThis deletes the stored chat history from the server and clears the recovery code from this device. It cannot be undone.",
          );
    if (!confirmed) return;

    const codeToDelete = code;
    setCode(null);
    setMessages([]);
    setRisk(null);
    setInput("");
    try {
      localStorage.removeItem(CODE_KEY);
      localStorage.removeItem(CLOSING_SHOWN_KEY);
    } catch {
      /* ignore */
    }
    if (codeToDelete) {
      try {
        await fetch(apiUrl(`/api/session?code=${encodeURIComponent(codeToDelete)}`), {
          method: "DELETE",
        });
      } catch {
        /* best-effort */
      }
    }
  }, [code]);

  const empty = hydrated && messages.length === 0;

  return (
    <main className="relative h-dvh overflow-hidden flex flex-col bg-paper text-ink">
      <PaperSurface />

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
            <Link
              href="/letters"
              className="eyebrow hidden md:inline text-margin hover:text-aubergine transition-colors"
            >
              letters
            </Link>
          </div>
          <RecoveryCodePill
            code={code}
            onUseCode={handleUseCode}
            onStartNew={handleStartNew}
            onForget={handleForget}
          />
        </div>
      </header>

      <div
        ref={scrollerRef}
        className="flex-1 overflow-y-auto px-6 sm:px-10 lg:px-16 pb-52"
      >
        <div ref={contentRef} className="mx-auto w-full max-w-[820px] pt-12 sm:pt-20">
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

                <div className="mt-14 hairline pt-5 flex items-baseline justify-between">
                  <div className="eyebrow">or</div>
                  <Link
                    href="/letters/new"
                    className="display italic text-[16px] text-aubergine hover:text-violetInk transition-colors"
                  >
                    write to yourself →
                  </Link>
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

      <div className="fixed bottom-0 left-0 right-0 z-20 pointer-events-none">
        <div className="h-12 bg-gradient-to-t from-paper to-transparent" />
        <div className="bg-paper hairline-t pointer-events-auto">
          <div className="mx-auto w-full max-w-[820px] px-6 sm:px-10 lg:px-16 py-5 sm:py-6 space-y-4">
            <CrisisSupport
              risk={risk}
              onDismiss={() => setRisk(null)}
            />
            <ChatInput
              value={input}
              onChange={(v) => {
                setInput(v);
                bump();
              }}
              onSubmit={() => send(input)}
              disabled={streaming}
            />
            <div className="eyebrow text-margin/80 text-center">
              vespers is a wellness companion · not a substitute for medical or
              emergency care
            </div>
          </div>
        </div>
      </div>

      <ClosingRitual
        open={closingOpen}
        onDismiss={() => setClosingOpen(false)}
        onSubmit={onClosingSubmit}
      />
    </main>
  );
}
