"use client";

import { WordmarkVespers } from "./WordmarkVespers";

const STAMP = ["no login", "no account", "anonymous", "private by recovery code"];

export function MovementOpen() {
  return (
    <section className="relative w-full min-h-[100svh] flex flex-col">
      {/* tiny mast */}
      <header className="mx-auto max-w-[1240px] w-full px-6 sm:px-10 lg:px-16 pt-8 sm:pt-10 flex items-center justify-between">
        <span className="eyebrow">Vespers — est. for difficult evenings</span>
        <a href="/app" className="eyebrow ink-link no-underline">
          enter →
        </a>
      </header>

      {/* wordmark, set asymmetrically rather than dead-center */}
      <div className="flex-1 grid grid-cols-12 items-center mx-auto max-w-[1240px] w-full px-6 sm:px-10 lg:px-16">
        <div className="col-span-12 md:col-start-2 md:col-span-10 lg:col-start-2 lg:col-span-9">
          <div className="flex items-end gap-6">
            <WordmarkVespers />
          </div>

          {/* MASTHEAD STAMP — letterpress dateline asserting the privacy promise */}
          <div className="mt-2 sm:mt-3 hairline pt-3 sm:pt-4">
            <div className="flex flex-wrap items-center gap-x-4 sm:gap-x-6 gap-y-1.5">
              {STAMP.map((label, i) => (
                <span key={label} className="flex items-center gap-x-4 sm:gap-x-6">
                  <span
                    className="eyebrow"
                    style={{ color: "#0B2545", fontSize: "12px", letterSpacing: "0.24em" }}
                  >
                    {label}
                  </span>
                  {i < STAMP.length - 1 && (
                    <span className="text-margin/50 text-[10px]">·</span>
                  )}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-8 sm:mt-10 grid grid-cols-12 items-baseline gap-x-6 gap-y-5">
            <p className="display col-span-12 md:col-span-7 text-[clamp(20px,2.4vw,30px)] leading-snug text-ink/90 italic">
              a quiet place for stress, anxiety, sadness, and the tangled days.
              <br />
              <span className="not-italic text-margin text-[14.5px]">
                no sign-up. nothing leaves the room.
              </span>
            </p>

            {/* recovery code specimen — the proof beside the promise */}
            <div className="col-span-12 md:col-span-4 md:col-start-9">
              <span className="eyebrow block mb-2.5">your private thread</span>
              <code className="block font-mono text-[14px] sm:text-[15px] tracking-[0.22em] text-ink hairline-b pb-2.5">
                VESP-7Q9F-X41M
              </code>
              <p className="text-[12.5px] leading-relaxed text-margin mt-3">
                a specimen. yours is generated on the first message,
                kept only by you.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* footer rule + scroll cue */}
      <div className="mx-auto max-w-[1240px] w-full px-6 sm:px-10 lg:px-16 pb-8 sm:pb-10 flex items-end justify-between">
        <span className="eyebrow">vol. i &nbsp;·&nbsp; ten movements</span>
        <span className="eyebrow opacity-70">scroll, slowly ↓</span>
      </div>
    </section>
  );
}
