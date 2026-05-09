"use client";

import { Reveal } from "./Reveal";
import { SectionShell } from "./SectionShell";

export function MovementLetter() {
  return (
    <SectionShell number="02" title="the letter">
      <div className="grid grid-cols-12 gap-6">
        <div className="hidden md:block md:col-span-2 lg:col-span-2">
          <Reveal>
            <div className="eyebrow leading-relaxed sticky top-24">
              addressed to&nbsp;
              <br />
              the reader,
              <br />
              from vespers.
            </div>
          </Reveal>
        </div>

        <article className="col-span-12 md:col-span-9 lg:col-start-3 lg:col-span-8">
          <Reveal>
            <p className="display text-[clamp(18px,1.45vw,21px)] leading-[1.7] text-ink/95">
              <span
                aria-hidden
                className="display float-left mr-3 mt-1 text-[6.2em] leading-[0.82] text-aubergine font-medium"
                style={{ fontFeatureSettings: "'ss01'" }}
              >
                S
              </span>
              ome evenings, the noise inside the head outpaces the noise outside.
              The day asks more than it gave back. A small thing tilts, and an
              older feeling — long-shelved — wakes up and walks the hallway.
              You do not need to know its name to be tired of it. You only need
              somewhere to set it down for a moment.
            </p>
          </Reveal>

          <Reveal delay={0.08}>
            <p className="display text-[clamp(18px,1.45vw,21px)] leading-[1.7] text-ink/95 mt-6">
              Vespers is that place. Not a clinic, not a feed, not a friend who
              has their own week to carry. A{" "}
              <span className="script text-aubergine text-[1.45em] leading-none align-[-0.08em]">
                quiet
              </span>{" "}
              room with the light low, where the words can come out a little
              crooked and still be received. We listen first. We are slow
              before we are useful, because most evenings, slow is the use.
            </p>
          </Reveal>

          <Reveal delay={0.16}>
            <p className="display text-[clamp(18px,1.45vw,21px)] leading-[1.7] text-ink/95 mt-6">
              Whatever you bring stays linked to a private recovery code that
              only you keep. No account, no inbox, no audience. The next time
              you return, the conversation does too — gently — so you don&rsquo;t
              have to retell what already cost something to say. You are{" "}
              <span className="script text-aubergine text-[1.45em] leading-none align-[-0.08em]">
                heard
              </span>
              , and remembered, in proportion.
            </p>
          </Reveal>

          <Reveal delay={0.22}>
            <div className="mt-10 flex items-center gap-3 text-margin text-[13px]">
              <span className="hairline-b inline-block w-10" />
              <span className="eyebrow">signed,&nbsp; vespers</span>
            </div>
          </Reveal>
        </article>
      </div>
    </SectionShell>
  );
}
