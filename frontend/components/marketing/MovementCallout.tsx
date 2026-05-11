"use client";

import { Reveal } from "./Reveal";

/**
 * Slim hand-off band that sits directly under the hero. Mirrors the two CTAs
 * from MovementClose so visitors don't have to scroll the entire essay to
 * find them — the same pair still anchors the bottom of the page.
 *
 * Not a numbered movement on purpose: it's a quiet shelf between the hero
 * and "the whisper", framed with hairlines so it reads as part of the
 * letterpress dateline rather than a banner.
 */
export function MovementCallout() {
  return (
    <section className="relative w-full">
      <div className="mx-auto max-w-[1240px] w-full px-6 sm:px-10 lg:px-16 py-10 sm:py-14">
        <div className="hairline" />
        <Reveal>
          <div className="mt-8 sm:mt-10 grid grid-cols-12 gap-6 items-end">
            <div className="col-span-12 sm:col-span-6">
              <a
                href="/feel"
                className="ink-link display text-[clamp(20px,2vw,28px)] tracking-tight"
              >
                → begin a session
              </a>
              <p className="mt-3 text-margin text-[13px] leading-relaxed max-w-sm">
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
        </Reveal>
        <div className="hairline mt-10" />
      </div>
    </section>
  );
}
