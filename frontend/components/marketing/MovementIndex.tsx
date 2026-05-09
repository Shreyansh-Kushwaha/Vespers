"use client";

import { Reveal } from "./Reveal";
import { SectionShell } from "./SectionShell";

const ENTRIES: Array<{ n: string; topic: string; gloss: string; page: string }> = [
  { n: "01", topic: "stress, the recurring kind", gloss: "the day-after-day weight you stopped naming", page: "p. 14" },
  { n: "02", topic: "overthinking", gloss: "the loop that won't take a breath", page: "p. 22" },
  { n: "03", topic: "anxiety, before the thing", gloss: "the body's rehearsal of a future not yet here", page: "p. 31" },
  { n: "04", topic: "grief, of every size", gloss: "for losses both named and quietly carried", page: "p. 40" },
  { n: "05", topic: "loneliness, in a crowd", gloss: "the ache that is not solved by company alone", page: "p. 49" },
  { n: "06", topic: "burnout", gloss: "what arrives after caring for too long without rest", page: "p. 58" },
  { n: "07", topic: "the numb days", gloss: "when feelings refuse the door — that is also a feeling", page: "p. 67" },
  { n: "08", topic: "trauma, gently", gloss: "approached only at the pace you choose", page: "p. 76" },
  { n: "09", topic: "the ordinary tangle", gloss: "for nothing-in-particular days that still feel heavy", page: "p. 85" },
];

export function MovementIndex() {
  return (
    <SectionShell number="05" title="the index">
      <div className="grid grid-cols-12 gap-6 mb-12">
        <div className="col-span-12 md:col-start-2 md:col-span-10 lg:col-start-2 lg:col-span-7">
          <Reveal as="h2" className="display text-[clamp(28px,3.6vw,52px)] leading-[1.1] tracking-[-0.01em] text-ink">
            things vespers can hold
            <br />
            <span className="italic text-margin">— a contents page.</span>
          </Reveal>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        <ol className="col-span-12 md:col-start-2 md:col-span-10 lg:col-start-2 lg:col-span-9">
          {ENTRIES.map((e, i) => (
            <Reveal key={e.n} delay={i * 0.04} as="li" className="block">
              <div
                className={`grid grid-cols-[64px_1fr_auto] items-baseline gap-x-6 sm:gap-x-10 py-5 sm:py-6 ${
                  i === 0 ? "" : "hairline"
                }`}
              >
                <span className="display tabular-nums text-[18px] tracking-tight text-aubergine">{e.n}</span>
                <div>
                  <div className="display text-[clamp(20px,2vw,28px)] leading-snug text-ink">
                    {e.topic}
                  </div>
                  <div className="text-margin text-[13.5px] leading-relaxed mt-1.5 italic">
                    {e.gloss}
                  </div>
                </div>
                <span className="display tabular-nums text-[15px] text-margin">{e.page}</span>
              </div>
            </Reveal>
          ))}
          <div className="hairline" />
        </ol>
      </div>
    </SectionShell>
  );
}
