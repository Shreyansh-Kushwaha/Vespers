"use client";

import { Reveal } from "./Reveal";
import { SectionShell } from "./SectionShell";

export function MovementWhisper() {
  return (
    <SectionShell number="01" title="the whisper">
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 md:col-start-2 md:col-span-10 lg:col-start-2 lg:col-span-9">
          <Reveal as="p" className="display text-ink leading-[1.05] text-[clamp(40px,7vw,108px)] tracking-[-0.02em]">
            <span className="lowercase">what&rsquo;s been </span>
            <span className="script text-aubergine align-baseline mx-2 text-[1.05em]">weighing</span>
            <br className="hidden sm:block" />
            <span className="lowercase">on you tonight?</span>
          </Reveal>
          <Reveal delay={0.15}>
            <div className="mt-12 sm:mt-16 max-w-md text-margin text-[14px] leading-relaxed">
              there is no correct answer, and no one waiting for one.
              the question is the door, not the test.
            </div>
          </Reveal>
        </div>
      </div>
    </SectionShell>
  );
}
