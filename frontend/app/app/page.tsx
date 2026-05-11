"use client";

import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChatInput } from "@/components/ChatInput";
import {
  GappuAvatar, detectReactions, looksLikeLaughter,
  type GappuMood, type GappuReaction, type GappuReactionEvent,
} from "@/components/GappuAvatar";
import { MessageBubble, type ChatRole, type Persona } from "@/components/MessageBubble";
import { PersonaToggle } from "@/components/PersonaToggle";
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
  /** Thread the message belongs to. Drives per-persona filtering. */
  persona?: Persona;
  /** Only set on assistant messages when a crisis override made the reply
   *  come from the stand-in persona; used for bubble styling so the rendered
   *  bubble still reads as the stand-in. */
  replyPersona?: Persona;
}

const CODE_KEY = "vespers.code";
const CLOSING_SHOWN_KEY = "vespers.closing.lastShownTs";
const CLOSING_COOLDOWN_MS = 1000 * 60 * 60 * 6; // 6h between auto-prompts
const INACTIVITY_MS = 1000 * 60 * 10; // 10 min

/** Persona persistence is per-code (a returning user gets the same companion
 *  they were last talking to). Pre-code sessions fall back to a session-level
 *  key so the toggle survives a refresh before the first message. */
const PERSONA_KEY_PREFIX = "vespers.persona.";
const PERSONA_KEY_SESSION = "vespers.persona.session";
function personaKey(code: string | null): string {
  return code ? PERSONA_KEY_PREFIX + code : PERSONA_KEY_SESSION;
}
function readPersona(code: string | null): Persona {
  if (typeof localStorage === "undefined") return "vespers";
  const v = localStorage.getItem(personaKey(code));
  return v === "gappu" ? "gappu" : "vespers";
}
function writePersona(code: string | null, p: Persona): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(personaKey(code), p);
  } catch {
    /* storage unavailable */
  }
}

const PERSONA_SWITCH_NOTICE: Record<Persona, string> = {
  gappu: "switched to gappu — ready to talk bakwaas",
  vespers: "switched to vespers — soft landing",
};

const VESPERS_PROMPTS = [
  "i've been feeling stretched thin lately.",
  "help me untangle what i'm feeling right now.",
  "i'm anxious about something and can't slow down.",
  "i just need someone to listen for a minute.",
];

const GAPPU_PROMPTS = [
  "yaar mood off hai, kuch bata na",
  "boss roast me kar do thoda, mood lift kar",
  "aaj kuch productive nahi kiya, lecture mat dena",
  "bas bakwaas suni hai, ek joke maar",
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
  const [persona, setPersonaState] = useState<Persona>("vespers");
  const [gappuMood, setGappuMood] = useState<GappuMood>("idle");
  const [gappuReaction, setGappuReaction] = useState<GappuReactionEvent | null>(null);
  const [gappuFirstMessage, setGappuFirstMessage] = useState(false);
  const [gappuError, setGappuError] = useState(false);
  const [gappuCrisis, setGappuCrisis] = useState(false);
  // Click / drag / fall state for the interactive avatar.
  const [gappuDazed, setGappuDazed] = useState(false);
  const [gappuFallen, setGappuFallen] = useState(false);
  // Manual drag — framer's `drag` snaps the wrapper back to origin on release,
  // which made the fall always start from (0,0) instead of where you dropped
  // him. We track pointer state ourselves so the fall begins at the release
  // position.
  const [gappuPos, setGappuPos] = useState({ x: 0, y: 0 });
  const [gappuFallFrom, setGappuFallFrom] = useState({ x: 0, y: 0 });
  const [gappuPointerActive, setGappuPointerActive] = useState(false);
  const gappuDownRef = useRef<{
    startX: number; startY: number;
    baseX: number; baseY: number;
    moved: boolean;
  } | null>(null);
  const reactionIdRef = useRef(0);
  const reactionsFiredRef = useRef<Set<GappuReaction>>(new Set());

  const scrollerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [inputWrapEl, setInputWrapEl] = useState<HTMLDivElement | null>(null);
  const stickToBottomRef = useRef(true);
  const isProgrammaticScrollRef = useRef(false);

  // Hydrate from saved recovery code.
  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem(CODE_KEY) : null;
    if (saved) {
      setCode(saved);
      setPersonaState(readPersona(saved));
      fetch(apiUrl(`/api/session?code=${encodeURIComponent(saved)}`))
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data?.ok && Array.isArray(data.messages)) {
            const restored: ChatMsg[] = data.messages.map(
              (m: { role: string; content: string; persona?: string; replyPersona?: string }) => ({
                id: uid(),
                role: m.role === "model" ? "assistant" : "user",
                content: m.content,
                persona: m.persona === "gappu" ? "gappu" : "vespers",
                replyPersona:
                  m.replyPersona === "gappu" || m.replyPersona === "vespers"
                    ? m.replyPersona
                    : undefined,
              }),
            );
            setMessages(restored);
          }
        })
        .catch(() => {})
        .finally(() => setHydrated(true));
    } else {
      setPersonaState(readPersona(null));
      setHydrated(true);
    }
  }, []);

  // Persona switch — emit a slim system notice inline and persist per code.
  const switchPersona = useCallback(
    (next: Persona) => {
      setPersonaState((cur) => {
        if (cur === next) return cur;
        writePersona(code, next);
        if (messages.length > 0) {
          setMessages((m) => [
            ...m,
            {
              id: uid(),
              role: "system",
              content: PERSONA_SWITCH_NOTICE[next],
              // The notice announces arrival into the new thread, so it
              // lives there — not in the one being left behind.
              persona: next,
            },
          ]);
        }
        return next;
      });
    },
    [code, messages.length],
  );

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

      const requestedPersona = persona;
      const userMsg: ChatMsg = {
        id: uid(), role: "user", content: trimmed, persona: requestedPersona,
      };
      const assistantMsg: ChatMsg = {
        id: uid(),
        role: "assistant",
        content: "",
        pending: true,
        persona: requestedPersona,
      };
      stickToBottomRef.current = true;
      setMessages((m) => [...m, userMsg, assistantMsg]);
      setInput("");
      setStreaming(true);
      if (requestedPersona === "gappu") {
        setGappuMood("thinking");
        // Hello wave fires on the very first message of a fresh gappu thread.
        const noGappuYet = !messages.some(
          (m) => (m.persona ?? "vespers") === "gappu",
        );
        if (noGappuYet) {
          setGappuFirstMessage(true);
          setTimeout(() => setGappuFirstMessage(false), 2400);
        }
        setGappuError(false);
        setGappuCrisis(false);
        reactionsFiredRef.current = new Set();
      }
      bump();

      try {
        const res = await fetch(apiUrl("/api/chat"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: trimmed, code, persona: requestedPersona }),
        });

        const newCode = res.headers.get("X-Vespers-Code");
        if (newCode) {
          setCode(newCode);
          try {
            localStorage.setItem(CODE_KEY, newCode);
            // Migrate session-scoped persona pref onto the freshly minted code
            // so a returning user finds the same companion.
            const sessionPref = localStorage.getItem(PERSONA_KEY_SESSION);
            if (sessionPref === "gappu" || sessionPref === "vespers") {
              writePersona(newCode, sessionPref);
            }
          } catch {
            /* storage unavailable */
          }
        }

        // Effective persona — backend may have flipped to vespers on a crisis
        // turn. The MESSAGE still belongs to the user's thread (requested
        // persona); we just style the assistant bubble as the stand-in via
        // `replyPersona`. Persona preference is NOT changed.
        const effective = res.headers.get("X-Vespers-Persona");
        const effectivePersona: Persona = effective === "gappu" ? "gappu" : "vespers";
        if (effectivePersona !== requestedPersona) {
          if (requestedPersona === "gappu") setGappuCrisis(true);
          setMessages((m) => {
            const withNotice: ChatMsg[] = [...m];
            const idx = withNotice.findIndex((x) => x.id === assistantMsg.id);
            const notice: ChatMsg = {
              id: uid(),
              role: "system",
              content:
                requestedPersona === "gappu"
                  ? "gappu stepped aside — vespers is here for this one"
                  : "vespers stepped aside — gappu is here",
              // Notice belongs to the thread the user is in.
              persona: requestedPersona,
            };
            if (idx >= 0) withNotice.splice(idx, 0, notice);
            else withNotice.push(notice);
            return withNotice.map((x) =>
              x.id === assistantMsg.id
                ? { ...x, replyPersona: effectivePersona }
                : x,
            );
          });
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
        let gotFirstChunk = false;
        let laughed = false;
        let laughResetId: ReturnType<typeof setTimeout> | null = null;
        // Only drive avatar moods while Gappu's persona actually answered —
        // crisis override could have flipped effectivePersona to vespers.
        const driveAvatar = requestedPersona === "gappu" && effectivePersona === "gappu";
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          acc += decoder.decode(value, { stream: true });
          if (!gotFirstChunk) {
            gotFirstChunk = true;
            if (driveAvatar) setGappuMood("talking");
          }
          if (driveAvatar && !laughed && looksLikeLaughter(acc)) {
            laughed = true;
            setGappuMood("laughing");
            laughResetId = setTimeout(() => setGappuMood("talking"), 1600);
          }
          // Stream content reactions — fire each type at most once per response.
          if (driveAvatar) {
            const found = detectReactions(acc);
            for (const r of found) {
              if (reactionsFiredRef.current.has(r)) continue;
              reactionsFiredRef.current.add(r);
              reactionIdRef.current += 1;
              setGappuReaction({ type: r, id: reactionIdRef.current });
              break; // one trigger per chunk feels less spammy
            }
          }
          setMessages((m) =>
            m.map((msg) =>
              msg.id === assistantMsg.id
                ? { ...msg, pending: false, content: acc }
                : msg,
            ),
          );
        }
        if (laughResetId) clearTimeout(laughResetId);
        if (driveAvatar) {
          // settle on smiling if the reply ended on a laughy note, otherwise idle
          setGappuMood(looksLikeLaughter(acc) ? "smiling" : "idle");
        } else if (requestedPersona === "gappu") {
          // crisis turn — keep mascot calm
          setGappuMood("idle");
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
        if (requestedPersona === "gappu") {
          setGappuError(true);
          setTimeout(() => setGappuError(false), 1400);
        }
      } finally {
        setStreaming(false);
        // Don't strand the mascot in "thinking" if the stream never started.
        setGappuMood((m) => (m === "thinking" ? "idle" : m));
        bump();
      }
    },
    [bump, code, persona, streaming, messages],
  );

  const handleUseCode = useCallback(async (newCode: string) => {
    setCode(newCode);
    setPersonaState(readPersona(newCode));
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
            data.messages.map((m: { role: string; content: string; persona?: string; replyPersona?: string }) => ({
              id: uid(),
              role: m.role === "model" ? "assistant" : "user",
              content: m.content,
              persona: m.persona === "gappu" ? "gappu" : "vespers",
              replyPersona:
                m.replyPersona === "gappu" || m.replyPersona === "vespers"
                  ? m.replyPersona
                  : undefined,
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
    setPersonaState("vespers");
    try {
      localStorage.removeItem(CODE_KEY);
      localStorage.removeItem(CLOSING_SHOWN_KEY);
      localStorage.removeItem(PERSONA_KEY_SESSION);
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
    setPersonaState("vespers");
    try {
      localStorage.removeItem(CODE_KEY);
      localStorage.removeItem(CLOSING_SHOWN_KEY);
      localStorage.removeItem(PERSONA_KEY_SESSION);
      if (codeToDelete) localStorage.removeItem(personaKey(codeToDelete));
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

  // Per-persona thread: only show messages belonging to the active persona.
  // Legacy messages without a persona field are treated as Vespers.
  const visibleMessages = messages.filter(
    (m) => (m.persona ?? "vespers") === persona,
  );
  const empty = hydrated && visibleMessages.length === 0;
  const prompts = persona === "gappu" ? GAPPU_PROMPTS : VESPERS_PROMPTS;

  return (
    <main className="relative h-dvh overflow-hidden flex flex-col bg-paper text-ink">
      <PaperSurface />

      <header className="sticky top-0 z-20 bg-paper/95 hairline-b">
        <div className="mx-auto max-w-[1240px] w-full px-6 sm:px-10 lg:px-16 py-5 sm:py-6 flex items-center justify-between gap-6 flex-wrap">
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
          <div className="flex items-center gap-3 sm:gap-5">
            <PersonaToggle
              value={persona}
              onChange={switchPersona}
              disabled={streaming}
            />
            <RecoveryCodePill
              code={code}
              onUseCode={handleUseCode}
              onStartNew={handleStartNew}
              onForget={handleForget}
            />
          </div>
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
                <div className="eyebrow mb-7">
                  {persona === "gappu"
                    ? "§ a louder room"
                    : "§ a quiet place"}
                </div>
                {persona === "gappu" ? (
                  <h1 className="display text-[clamp(34px,5.6vw,72px)] leading-[1.04] tracking-[-0.02em] text-ink">
                    oye,&nbsp;
                    <span
                      className="script align-baseline mx-1 text-[1.05em]"
                      style={{ color: "#B85A1E" }}
                    >
                      kya scene
                    </span>
                    <br />
                    <span className="lowercase">hai aaj?</span>
                  </h1>
                ) : (
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
                )}
                <p className="text-margin text-[14.5px] sm:text-[15px] leading-[1.75] mt-9 max-w-md">
                  {persona === "gappu"
                    ? "Gappu here. bata bata, sab bakwaas suni jayegi. tu chalu kar, baaki main sambhal lunga."
                    : "i’m vespers. write what’s true — even crooked, even half-formed. you’re anonymous; whatever you share stays linked only to your private recovery code."}
                </p>

                <div className="mt-14 sm:mt-16 hairline pt-3">
                  <div className="eyebrow mb-6">
                    {persona === "gappu" ? "openers" : "openings"}
                  </div>
                  <ol className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 max-w-3xl">
                    {prompts.map((p, i) => (
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

          {visibleMessages.length > 0 && (
            <div className="hairline">
              {visibleMessages.map((m) => (
                <MessageBubble
                  key={m.id}
                  role={m.role}
                  content={m.content}
                  pending={m.pending}
                  // bubble style: stand-in persona takes over during a crisis
                  // override, otherwise the thread's own persona.
                  persona={m.replyPersona ?? m.persona}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-20 pointer-events-none">
        <div className="h-12 bg-gradient-to-t from-paper to-transparent" />
        <div className="bg-paper hairline-t pointer-events-auto">
          <div className="relative mx-auto w-full max-w-[820px] px-6 sm:px-10 lg:px-16 py-5 sm:py-6 space-y-4">
            {persona === "gappu" && (
              <motion.div
                onPointerDown={(e) => {
                  if (gappuFallen) return;
                  (e.target as Element).setPointerCapture?.(e.pointerId);
                  gappuDownRef.current = {
                    startX: e.clientX, startY: e.clientY,
                    baseX: gappuPos.x, baseY: gappuPos.y,
                    moved: false,
                  };
                  setGappuPointerActive(true);
                }}
                onPointerMove={(e) => {
                  const ref = gappuDownRef.current;
                  if (!ref) return;
                  const dx = e.clientX - ref.startX;
                  const dy = e.clientY - ref.startY;
                  if (!ref.moved && Math.hypot(dx, dy) > 5) {
                    ref.moved = true;
                  }
                  if (ref.moved) {
                    setGappuPos({ x: ref.baseX + dx, y: ref.baseY + dy });
                  }
                }}
                onPointerUp={(e) => {
                  const ref = gappuDownRef.current;
                  gappuDownRef.current = null;
                  setGappuPointerActive(false);
                  if (!ref) return;
                  try {
                    (e.target as Element).releasePointerCapture?.(e.pointerId);
                  } catch { /* ignore */ }
                  if (!ref.moved) {
                    // Click → beat
                    if (gappuFallen) return;
                    setGappuDazed(true);
                    setTimeout(() => setGappuDazed(false), 900);
                    return;
                  }
                  // Drag release → fall from the release point
                  setGappuFallFrom({ x: gappuPos.x, y: gappuPos.y });
                  setGappuFallen(true);
                  setGappuDazed(true);
                  setTimeout(() => {
                    setGappuFallen(false);
                    setGappuDazed(false);
                    setGappuPos({ x: 0, y: 0 });
                  }, 2400);
                }}
                onPointerCancel={() => {
                  gappuDownRef.current = null;
                  setGappuPointerActive(false);
                }}
                className="absolute select-none cursor-grab active:cursor-grabbing"
                style={{ top: -56, right: 18, touchAction: "none" }}
                animate={
                  gappuFallen
                    ? {
                        x: [
                          gappuFallFrom.x,
                          gappuFallFrom.x + 6,
                          gappuFallFrom.x + 4,
                          gappuFallFrom.x + 8,
                        ],
                        y: [
                          gappuFallFrom.y,
                          gappuFallFrom.y + 70,
                          gappuFallFrom.y + 60,
                          gappuFallFrom.y + 78,
                        ],
                        rotate: [0, 180, 210, 240],
                      }
                    : {
                        x: gappuPos.x,
                        y: gappuPos.y,
                        rotate: 0,
                      }
                }
                transition={
                  gappuFallen
                    ? {
                        duration: 1.6,
                        ease: "easeOut",
                        times: [0, 0.45, 0.7, 1],
                      }
                    : gappuPointerActive
                    ? { duration: 0 }
                    : { type: "spring", stiffness: 220, damping: 18 }
                }
                whileHover={{ scale: 1.04 }}
                aria-hidden
              >
                <motion.div
                  animate={
                    gappuDazed && !gappuFallen
                      ? { x: [-3, 3, -2, 2, 0], rotate: [-3, 3, -2, 2, 0] }
                      : { x: 0, rotate: 0 }
                  }
                  transition={
                    gappuDazed && !gappuFallen
                      ? { duration: 0.45 }
                      : { duration: 0.2 }
                  }
                >
                  <GappuAvatar
                    mood={gappuMood}
                    size={84}
                    peekTarget={inputWrapEl}
                    reactionEvent={gappuReaction}
                    firstMessage={gappuFirstMessage}
                    errorMode={gappuError}
                    crisisOverride={gappuCrisis}
                    dazed={gappuDazed || gappuFallen}
                  />
                </motion.div>
              </motion.div>
            )}
            <CrisisSupport
              risk={risk}
              onDismiss={() => setRisk(null)}
            />
            <div ref={setInputWrapEl}>
              <ChatInput
                value={input}
                onChange={(v) => {
                  setInput(v);
                  bump();
                }}
                onSubmit={() => send(input)}
                disabled={streaming}
              />
            </div>
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
