"use client";

import { Reveal } from "./Reveal";
import { SectionShell } from "./SectionShell";

interface Ritual {
  verb: string;
  name: string;
  body: string;
  ill: "candle" | "thread" | "tide";
}

const RITUALS: Ritual[] = [
  {
    verb: "pause",
    name: "daily check-in",
    body:
      "a ninety-second visit. one question, one breath, one sentence in return. small enough to keep, large enough to land.",
    ill: "candle",
  },
  {
    verb: "return",
    name: "reflection thread",
    body:
      "your past sessions, kept privately under your recovery code. the next conversation begins where the last one rested.",
    ill: "thread",
  },
  {
    verb: "trace",
    name: "mood timeline",
    body:
      "a quiet line that reveals the shape of your week. not a score — a map, drawn faintly enough to read kindly.",
    ill: "tide",
  },
];

function Illustration({ kind }: { kind: Ritual["ill"] }) {
  const stroke = "#161412";
  if (kind === "candle") {
    return (
      <svg viewBox="0 0 120 120" width="100%" height="100%" aria-hidden>
        <path d="M60 28 C 58 22 62 18 60 12 C 58 18 62 22 60 28" fill="none" stroke={stroke} strokeWidth="1.2" strokeLinecap="round" />
        <line x1="60" y1="30" x2="60" y2="58" stroke={stroke} strokeWidth="1.2" />
        <rect x="46" y="58" width="28" height="42" fill="none" stroke={stroke} strokeWidth="1.2" />
        <line x1="40" y1="100" x2="80" y2="100" stroke={stroke} strokeWidth="1.2" />
      </svg>
    );
  }
  if (kind === "thread") {
    return (
      <svg viewBox="0 0 120 120" width="100%" height="100%" aria-hidden>
        <path
          d="M10 80 C 30 40, 50 110, 70 60 S 110 30, 110 70"
          fill="none"
          stroke={stroke}
          strokeWidth="1.2"
          strokeLinecap="round"
        />
        <circle cx="10" cy="80" r="2" fill={stroke} />
        <circle cx="110" cy="70" r="2" fill={stroke} />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 120 120" width="100%" height="100%" aria-hidden>
      <path d="M5 70 Q 30 50, 60 70 T 115 70" fill="none" stroke={stroke} strokeWidth="1.2" strokeLinecap="round" />
      <path d="M5 85 Q 30 65, 60 85 T 115 85" fill="none" stroke={stroke} strokeWidth="1.2" strokeLinecap="round" opacity="0.7" />
      <path d="M5 100 Q 30 80, 60 100 T 115 100" fill="none" stroke={stroke} strokeWidth="1.2" strokeLinecap="round" opacity="0.45" />
    </svg>
  );
}

export function MovementPractice() {
  return (
    <SectionShell number="06" title="the practice">
      <div className="grid grid-cols-12 gap-6 mb-14">
        <div className="col-span-12 md:col-start-2 md:col-span-10 lg:col-start-2 lg:col-span-8">
          <Reveal as="h2" className="display text-[clamp(28px,3.6vw,52px)] leading-[1.1] tracking-[-0.01em] text-ink">
            three small rituals,
            <br />
            <span className="italic">repeated, gently.</span>
          </Reveal>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-x-6 gap-y-12">
        {RITUALS.map((r, i) => (
          <Reveal
            key={r.name}
            delay={i * 0.08}
            className="col-span-12 md:col-span-4"
          >
            <div className="hairline pt-8 grid grid-cols-[1fr_72px] gap-4 items-start">
              <div>
                <span className="script text-[64px] sm:text-[72px] leading-[0.85] text-aubergine block mb-3">
                  {r.verb}
                </span>
                <div className="eyebrow mb-3">{r.name}</div>
                <p className="text-inkSoft text-[14.5px] leading-[1.7]">{r.body}</p>
              </div>
              <div className="w-[72px] h-[72px] opacity-80">
                <Illustration kind={r.ill} />
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </SectionShell>
  );
}
