"use client";

import { Reveal } from "./Reveal";
import { SectionShell } from "./SectionShell";

export function MovementClose() {
  return (
    <SectionShell number="08" title="the quiet close">
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 md:col-start-2 md:col-span-10 lg:col-start-3 lg:col-span-8">
          <Reveal as="h2" className="display text-[clamp(34px,5vw,76px)] leading-[1.05] tracking-[-0.02em] text-ink text-center sm:text-left">
            when you&rsquo;re ready,
            <br />
            there&rsquo;s a&nbsp;
            <span className="script text-aubergine text-[1.05em] inline-block align-baseline">
              quiet
            </span>{" "}
            place.
          </Reveal>

          <Reveal delay={0.12}>
            <div className="mt-12 sm:mt-16 grid grid-cols-12 gap-6 items-end">
              <div className="col-span-12 sm:col-span-6">
                <a
                  href="/app"
                  className="ink-link display text-[clamp(20px,2vw,28px)] tracking-tight"
                >
                  → begin a session
                </a>
                <p className="mt-4 text-margin text-[13px] leading-relaxed max-w-sm">
                  a private recovery code is generated on your first message. save it,
                  and the conversation will remember itself, only for you.
                </p>
              </div>
              <div className="col-span-12 sm:col-span-6 sm:text-right">
                <a
                  href="/play"
                  className="ink-link display text-[clamp(16px,1.4vw,20px)] tracking-tight italic text-inkSoft block"
                >
                  or wander the pond →
                </a>
                <p className="mt-3 text-margin text-[12.5px] leading-relaxed max-w-sm sm:ml-auto">
                  three quiet objects, when the words are too much.
                </p>
              </div>
            </div>
            <div className="mt-10 hairline pt-4">
              <span className="eyebrow">no account, no inbox, no audience.</span>
            </div>
          </Reveal>
        </div>
      </div>
    </SectionShell>
  );
}
