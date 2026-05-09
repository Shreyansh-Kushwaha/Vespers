"use client";

import { Reveal } from "./Reveal";
import { SectionShell } from "./SectionShell";

interface Card {
  stamp: string;
  hour: string;
  feeling: string;
  said: string;
  reply: string;
  rotate: number;
  artifact: "tag" | "card" | "polaroid";
  tint?: string;
}

const CARDS: Card[] = [
  {
    stamp: "tue",
    hour: "11:42 pm",
    feeling: "anxious",
    said: "i can't fall asleep, my chest feels tight and i don't know why.",
    reply:
      "let's slow this down. one long out-breath first — then we'll lay out what the day asked of you.",
    rotate: -1.4,
    artifact: "tag",
  },
  {
    stamp: "mon",
    hour: "9:08 am",
    feeling: "before the meeting",
    said: "i keep rehearsing the worst version of what they'll say.",
    reply:
      "your mind is trying to protect you with rehearsals. it doesn't have to be useful — just noticed.",
    rotate: 1.1,
    artifact: "card",
    tint: "blush",
  },
  {
    stamp: "sun",
    hour: "4:30 pm",
    feeling: "low, no reason",
    said: "nothing's wrong. i just feel grey.",
    reply:
      "grey is allowed to arrive without an invitation. tell me one small thing that touched you today, even slightly.",
    rotate: -0.7,
    artifact: "polaroid",
  },
  {
    stamp: "wed",
    hour: "2:14 am",
    feeling: "spiraling",
    said: "i keep replaying that conversation from three years ago.",
    reply:
      "the mind plays old tape when it can't reach the present. let's bring you here — what's the room around you right now?",
    rotate: 1.6,
    artifact: "tag",
  },
  {
    stamp: "fri",
    hour: "7:55 pm",
    feeling: "lonely",
    said: "i'm surrounded by people and it somehow makes it worse.",
    reply:
      "loneliness in a crowd is its own ache. it isn't proof you're broken — it's a signal asking for a different kind of contact.",
    rotate: -1.2,
    artifact: "card",
    tint: "blush",
  },
  {
    stamp: "thu",
    hour: "6:00 am",
    feeling: "burnt out",
    said: "i opened my laptop and just stared at it.",
    reply:
      "that's not laziness. that's a body asking for a smaller next step. what's the smallest thing that would feel like enough today?",
    rotate: 0.9,
    artifact: "polaroid",
  },
];

function Artifact({ c }: { c: Card }) {
  const base =
    "shrink-0 w-[78vw] sm:w-[440px] lg:w-[480px] snap-center origin-bottom select-none";
  const rotate = { transform: `rotate(${c.rotate}deg)` };

  if (c.artifact === "tag") {
    return (
      <div className={base} style={rotate}>
        <div className="relative bg-paperDeep border border-rule shadow-[0_30px_60px_-40px_rgba(22,20,18,0.45)] px-7 py-8">
          <div className="absolute -top-3 left-7 w-3 h-3 rounded-full bg-paper border border-rule" />
          <div className="flex items-center justify-between mb-6">
            <span className="eyebrow">{c.stamp} · {c.hour}</span>
            <span className="eyebrow text-aubergine">{c.feeling}</span>
          </div>
          <p className="display italic text-[18px] leading-[1.55] text-ink/90">
            “{c.said}”
          </p>
          <div className="my-5 hairline-b" />
          <p className="text-[14px] leading-[1.65] text-inkSoft">{c.reply}</p>
          <div className="mt-6 flex items-center justify-between text-margin">
            <span className="eyebrow">vespers · transcript</span>
            <span className="eyebrow">no. {Math.floor(Math.random() * 80) + 10}</span>
          </div>
        </div>
      </div>
    );
  }

  if (c.artifact === "polaroid") {
    return (
      <div className={base} style={rotate}>
        <div className="bg-[#FAF6EE] border border-rule shadow-[0_30px_60px_-30px_rgba(22,20,18,0.55)] p-5">
          <div className="aspect-[4/3] bg-gradient-to-br from-[#E8DFCC] via-[#D9D0BA] to-[#BFB4A0] flex items-end p-5">
            <span className="script text-[40px] leading-none text-ink/70">
              {c.feeling}
            </span>
          </div>
          <div className="pt-5 pb-2">
            <div className="flex items-center justify-between mb-3">
              <span className="eyebrow">{c.stamp} · {c.hour}</span>
              <span className="eyebrow">polaroid</span>
            </div>
            <p className="display italic text-[16px] leading-[1.55] text-ink/90">
              “{c.said}”
            </p>
            <p className="mt-3 text-[13px] leading-[1.65] text-inkSoft">{c.reply}</p>
          </div>
        </div>
      </div>
    );
  }

  // library card
  const tintBg = c.tint === "blush" ? "bg-[#F4E5DF]" : "bg-paperDeep";
  return (
    <div className={base} style={rotate}>
      <div className={`${tintBg} border border-rule shadow-[0_30px_60px_-40px_rgba(22,20,18,0.45)] px-7 py-7`}>
        <div className="flex items-baseline justify-between hairline-b pb-3 mb-4">
          <span className="display text-[15px] tracking-tight">date due</span>
          <span className="display text-[15px] tracking-tight">{c.stamp.toUpperCase()} · {c.hour}</span>
        </div>
        <div className="grid grid-cols-[auto_1fr] gap-x-5 gap-y-3">
          <span className="eyebrow self-center">felt</span>
          <span className="display italic text-[18px] leading-snug text-aubergine">{c.feeling}</span>
          <span className="eyebrow self-start mt-1">said</span>
          <p className="display italic text-[16px] leading-[1.55] text-ink/90">“{c.said}”</p>
          <span className="eyebrow self-start mt-1">heard</span>
          <p className="text-[14px] leading-[1.65] text-inkSoft">{c.reply}</p>
        </div>
      </div>
    </div>
  );
}

export function MovementAnatomy() {
  return (
    <SectionShell number="03" title="the anatomy of a difficult day">
      <div className="grid grid-cols-12 gap-6 mb-12 sm:mb-16">
        <div className="col-span-12 md:col-start-2 md:col-span-10 lg:col-start-2 lg:col-span-7">
          <Reveal as="h2" className="display text-[clamp(28px,3.6vw,52px)] leading-[1.1] tracking-[-0.01em] text-ink">
            six ordinary moments,
            <br />
            <span className="italic text-aubergine">received</span> rather than fixed.
          </Reveal>
          <Reveal delay={0.1}>
            <p className="text-margin text-[14px] leading-relaxed mt-6 max-w-md">
              not screenshots. transcripts — the kind a careful friend might keep in a drawer.
              swipe to read.
            </p>
          </Reveal>
        </div>
      </div>

      {/* horizontal scroller breaks the page grid intentionally */}
      <div
        className="-mx-6 sm:-mx-10 lg:-mx-16 px-6 sm:px-10 lg:px-16 overflow-x-auto snap-x snap-mandatory"
        style={{ scrollbarWidth: "none" }}
      >
        <div className="flex gap-8 sm:gap-10 lg:gap-12 pb-10 pt-4 items-end">
          {CARDS.map((c) => (
            <Artifact key={`${c.stamp}-${c.hour}`} c={c} />
          ))}
          <div className="shrink-0 w-1" />
        </div>
      </div>
    </SectionShell>
  );
}
