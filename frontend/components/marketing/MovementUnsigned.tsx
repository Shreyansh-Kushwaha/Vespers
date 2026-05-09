"use client";

import { Reveal } from "./Reveal";
import { SectionShell } from "./SectionShell";

interface Tenet {
  n: string;
  head: string;
  body: string;
}

const TENETS: Tenet[] = [
  {
    n: "i",
    head: "no account, no inbox.",
    body:
      "you write under no name. there is no email, no profile, no signed-in self. you arrive as you are; you stay anonymous, even to us.",
  },
  {
    n: "ii",
    head: "one private code, only yours.",
    body:
      "your recovery code (e.g. vesp-7q9f-x41m) is the only thread back to your conversation. only you hold it. lose it, and the thread closes with you.",
  },
  {
    n: "iii",
    head: "what we never store.",
    body:
      "no passwords. no payment details. no addresses, phone numbers, or government identifiers. if you mention them, vespers gently steers the conversation back — and stores nothing.",
  },
  {
    n: "iv",
    head: "no audience, no analytics on you.",
    body:
      "your words are not tracked across the web, sold, or surfaced to any feed. nothing you say leaves the room except the room itself.",
  },
];

export function MovementUnsigned() {
  return (
    <SectionShell number="07" title="the unsigned">
      <div className="grid grid-cols-12 gap-6 mb-14 sm:mb-16">
        <div className="col-span-12 md:col-start-2 md:col-span-10 lg:col-start-2 lg:col-span-8">
          <Reveal as="h2" className="display text-[clamp(30px,4.4vw,64px)] leading-[1.04] tracking-[-0.02em] text-ink">
            the conversation is{" "}
            <span className="script text-aubergine text-[1.05em] inline-block align-baseline">
              yours,
            </span>
            <br />
            no signature required.
          </Reveal>
          <Reveal delay={0.08}>
            <p className="text-margin text-[14.5px] leading-[1.75] mt-7 max-w-xl">
              vespers is anonymous by design. there is nothing to log into and
              nothing to log out of — just a private recovery code that only you
              keep, and a conversation that travels nowhere else.
            </p>
          </Reveal>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-x-6 gap-y-2">
        <ol className="col-span-12 md:col-start-2 md:col-span-10 lg:col-start-2 lg:col-span-9 grid grid-cols-1 sm:grid-cols-2 gap-x-12">
          {TENETS.map((t, i) => (
            <Reveal
              key={t.n}
              delay={i * 0.06}
              as="li"
              className="block hairline pt-6 pb-6 sm:pb-8 grid grid-cols-[44px_1fr] gap-x-4"
            >
              <span className="display italic text-aubergine text-[18px] tabular-nums leading-[1.5] tracking-tight">
                {t.n}.
              </span>
              <div>
                <h3 className="display text-[clamp(20px,2vw,26px)] leading-snug text-ink">
                  {t.head}
                </h3>
                <p className="text-inkSoft text-[14.5px] leading-[1.75] mt-3">
                  {t.body}
                </p>
              </div>
            </Reveal>
          ))}
          <li className="col-span-1 sm:col-span-2 hairline" />
        </ol>
      </div>

      <Reveal delay={0.16}>
        <p className="mt-12 sm:mt-14 mx-auto max-w-2xl text-center display italic text-[clamp(16px,1.4vw,20px)] leading-[1.7] text-margin">
          unsigned, unread, unstored — except by you, and the quiet model that
          replies in the moment.
        </p>
      </Reveal>
    </SectionShell>
  );
}
