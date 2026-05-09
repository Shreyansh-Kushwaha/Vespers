"use client";

import { useEffect, useRef, useState } from "react";
import { Reveal } from "./Reveal";
import { SectionShell } from "./SectionShell";

type Line = { who: "you" | "vespers"; text: string };

const SCRIPT: Line[] = [
  { who: "you", text: "i don't even know what i'm feeling tonight." },
  {
    who: "vespers",
    text:
      "that's a real place to begin. let's not name it yet. tell me what the last hour felt like in your body — tight, heavy, restless, hollow?",
  },
  { who: "you", text: "heavy. like i'm standing in cold water." },
  {
    who: "vespers",
    text:
      "that's a precise image — keep it. heavy and cold often arrive when something asked too much of you today. anything in particular ask?",
  },
  { who: "you", text: "i think i let myself down again." },
  {
    who: "vespers",
    text:
      "that sentence is heavy on its own. before we examine it, can we agree it isn't a verdict — it's a feeling, and feelings deserve to be looked at gently before they're argued with?",
  },
];

export function MovementCompanion() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setActive(true)),
      { threshold: 0.35 },
    );
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  return (
    <SectionShell number="04" title="the companion">
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 md:col-start-2 md:col-span-10 lg:col-start-2 lg:col-span-5">
          <Reveal as="h2" className="display text-[clamp(28px,3.6vw,52px)] leading-[1.1] tracking-[-0.01em] text-ink">
            no chat ui.
            <br />
            just a&nbsp;
            <span className="script text-aubergine text-[1.05em]">conversation</span>
            <br />
            written down.
          </Reveal>
          <Reveal delay={0.1}>
            <p className="text-margin text-[14px] leading-relaxed mt-6 max-w-md">
              vespers responds slowly, in full sentences, the way a thoughtful
              person would. there are no buttons to press, no moods to pick from
              a grid. you write what's true; vespers reads carefully.
            </p>
          </Reveal>

          <Reveal delay={0.18}>
            <div className="mt-10 flex items-center gap-6 text-margin text-[12px]">
              <span className="eyebrow">streaming, in real time</span>
              <span className="hairline-b inline-block flex-1" />
              <span className="eyebrow">avg. 0.8s to first word</span>
            </div>
          </Reveal>
        </div>

        <div
          ref={ref}
          className="col-span-12 md:col-span-12 lg:col-start-8 lg:col-span-5 mt-12 lg:mt-0"
        >
          <Reveal>
            <div className="bg-paperDeep/60 border border-rule px-7 py-8 sm:px-9 sm:py-10 shadow-[0_30px_60px_-40px_rgba(22,20,18,0.4)]">
              <div className="flex items-center justify-between mb-6">
                <span className="eyebrow">transcript · session no. 14</span>
                <span className="eyebrow">vesp&middot;7Q9F&middot;X41M</span>
              </div>

              <div className="space-y-5">
                {SCRIPT.map((l, i) => (
                  <Stream key={i} line={l} active={active} index={i} />
                ))}
              </div>

              <div className="mt-8 hairline-b" />
              <div className="mt-3 flex items-center justify-between text-margin text-[11px]">
                <span className="eyebrow">end of excerpt</span>
                <span className="eyebrow">paper&nbsp;·&nbsp;loose-leaf</span>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </SectionShell>
  );
}

function Stream({ line, active, index }: { line: Line; active: boolean; index: number }) {
  const [shown, setShown] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!active) return;
    const startAfter = index === 0 ? 350 : 350 + index * 1100;
    const t = setTimeout(() => {
      const speed = line.who === "you" ? 28 : 18;
      let i = 0;
      const id = setInterval(() => {
        i += 1;
        setShown(line.text.slice(0, i));
        if (i >= line.text.length) {
          clearInterval(id);
          setDone(true);
        }
      }, speed);
    }, startAfter);
    return () => clearTimeout(t);
  }, [active, index, line.text, line.who]);

  const prefix =
    line.who === "you" ? "you" : "vespers";

  return (
    <div className="grid grid-cols-[64px_1fr] gap-x-4 hairline-b pb-4">
      <span className="eyebrow pt-[6px]">{prefix}</span>
      <p
        className={`display text-[15px] sm:text-[16px] leading-[1.7] ${
          line.who === "you" ? "italic text-ink/90" : "text-inkSoft"
        }`}
      >
        {shown}
        {!done && active && <span className="caret align-baseline" />}
      </p>
    </div>
  );
}
