"use client";

import { Reveal } from "./Reveal";

export function Footnote() {
  return (
    <footer className="hairline">
      <div className="mx-auto max-w-[1240px] px-6 sm:px-10 lg:px-16 py-16 sm:py-20">
        <Reveal>
          <div className="grid grid-cols-12 gap-x-6 gap-y-8">
            <div className="col-span-12 md:col-span-5">
              <span className="script text-[52px] leading-none text-aubergine">Vespers</span>
              <p className="mt-4 text-inkSoft text-[13.5px] leading-[1.7] max-w-sm">
                a calm, premium emotional wellness companion. anonymous, unsigned,
                and listening — slowly — since the year you needed it.
              </p>
            </div>

            <ol className="col-span-12 md:col-span-7 text-margin text-[13px] leading-[1.85] grid grid-cols-1 sm:grid-cols-2 gap-x-8">
              <li className="flex gap-3">
                <span className="display tabular-nums text-aubergine">¹</span>
                <span>
                  vespers is a wellness companion, not a substitute for medical or
                  psychiatric care.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="display tabular-nums text-aubergine">²</span>
                <span>
                  if you are in crisis, please contact local emergency services or a
                  trusted person near you.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="display tabular-nums text-aubergine">³</span>
                <span>
                  conversations are linked to a private recovery code only you keep.
                  no accounts.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="display tabular-nums text-aubergine">⁴</span>
                <span>
                  no passwords, financial data, or government identifiers are ever
                  stored.
                </span>
              </li>
            </ol>
          </div>
        </Reveal>

        <div className="mt-14 hairline pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <span className="eyebrow">© vespers · vol. i</span>
          <span className="eyebrow">set in fraunces · allura · inter</span>
          <a href="/app" className="eyebrow ink-link">
            enter the quiet place →
          </a>
        </div>
      </div>
    </footer>
  );
}
