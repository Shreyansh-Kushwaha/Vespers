"use client";

import Link from "next/link";
import { PaperSurface } from "@/components/marketing/PaperSurface";

interface Game {
  slug: string;
  number: string;
  title: string;
  caption: string;
  body: string;
  duration: string;
}

const GAMES: Game[] = [
  {
    slug: "koi",
    number: "i",
    title: "the koi pond",
    caption: "a small thing to watch",
    body:
      "a still surface of dark water. tap to send out ripples. the koi will drift toward where you've been. nothing to win, nothing to do. stay as long as you like.",
    duration: "drop in for a minute, or twenty.",
  },
  {
    slug: "wash",
    number: "ii",
    title: "watercolor washes",
    caption: "a small thing to make",
    body:
      "a sheet of paper. pick a color, drop a bead, watch it bloom into the fibers. there is no correct picture — only the colors finding each other where they meet.",
    duration: "fifteen minutes can disappear here.",
  },
  {
    slug: "candle",
    number: "iii",
    title: "the candle",
    caption: "a small thing to light",
    body:
      "a wick, a quiet flame. the wax falls slowly while it burns. you can blow it out when you're ready. a closing ritual, or just somewhere to be still.",
    duration: "for as long as the candle stays lit.",
  },
  {
    slug: "breathe",
    number: "iv",
    title: "the breath",
    caption: "a small thing to follow",
    body:
      "a slow circle that grows and shrinks. inhale as it widens, exhale as it narrows. three named techniques — box, four-seven-eight, physiological sigh. for when the chest is tight, the room is loud, or the hands won't sit still.",
    duration: "two minutes is enough. five is more.",
  },
];

export default function PlayIndex() {
  return (
    <main className="relative bg-paper text-ink min-h-screen overflow-x-hidden">
      <PaperSurface />

      <header className="mx-auto max-w-[1240px] w-full px-6 sm:px-10 lg:px-16 pt-8 sm:pt-10 flex items-center justify-between">
        <Link href="/" className="eyebrow ink-link no-underline">
          ← Vespers
        </Link>
        <Link href="/app" className="eyebrow ink-link no-underline">
          to the conversation →
        </Link>
      </header>

      <section className="mx-auto max-w-[1240px] w-full px-6 sm:px-10 lg:px-16 pt-20 sm:pt-28 pb-16">
        <div className="eyebrow mb-10 sm:mb-14">§ play — four quiet objects</div>
        <h1 className="display text-[clamp(34px,5vw,72px)] leading-[1.05] tracking-[-0.02em] text-ink max-w-3xl">
          when the words are too much,{" "}
          <span className="script text-aubergine text-[1.05em] inline-block align-baseline">
            something
          </span>{" "}
          to do with your hands.
        </h1>
        <p className="mt-8 text-margin text-[14.5px] leading-[1.75] max-w-xl">
          four small visual objects. nothing to win, no score, no ending. you
          can leave at any time, and you can always go back to the conversation.
        </p>
      </section>

      <section className="mx-auto max-w-[1240px] w-full px-6 sm:px-10 lg:px-16 pb-24">
        <ol>
          {GAMES.map((g, i) => (
            <li
              key={g.slug}
              className={`grid grid-cols-12 gap-6 py-10 sm:py-14 ${
                i === 0 ? "hairline" : "hairline"
              }`}
            >
              <div className="col-span-12 md:col-span-1">
                <span className="display tabular-nums text-[20px] text-aubergine italic">
                  {g.number}.
                </span>
              </div>
              <div className="col-span-12 md:col-span-7">
                <Link
                  href={`/play/${g.slug}`}
                  className="display text-[clamp(28px,3.4vw,44px)] leading-[1.1] tracking-[-0.01em] text-ink ink-link no-underline"
                >
                  {g.title}
                </Link>
                <div className="eyebrow mt-2">{g.caption}</div>
                <p className="mt-5 text-inkSoft text-[15.5px] leading-[1.75] max-w-xl">
                  {g.body}
                </p>
                <div className="mt-6 flex items-center gap-3 text-margin text-[12.5px]">
                  <span className="hairline-b inline-block w-10" />
                  <span className="eyebrow">{g.duration}</span>
                </div>
              </div>
              <div className="col-span-12 md:col-span-4 flex md:justify-end items-start">
                <Link
                  href={`/play/${g.slug}`}
                  className="ink-link display text-[20px] tracking-tight no-underline"
                >
                  → enter
                </Link>
              </div>
            </li>
          ))}
          <li className="hairline" />
        </ol>
      </section>

      <footer className="mx-auto max-w-[1240px] w-full px-6 sm:px-10 lg:px-16 py-10 hairline flex items-center justify-between">
        <span className="eyebrow">vespers · play · vol. i</span>
        <Link href="/app" className="eyebrow ink-link">
          ← back to the conversation
        </Link>
      </footer>
    </main>
  );
}
