"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { PaperSurface } from "@/components/marketing/PaperSurface";
import { listLetters, MODE_LABEL, type Letter } from "@/lib/letters";

const CODE_KEY = "vespers.code";

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function preview(content: string): string {
  const trimmed = content.trim();
  if (!trimmed) return "(empty)";
  return trimmed.length > 110 ? trimmed.slice(0, 110) + "…" : trimmed;
}

export default function LettersIndexPage() {
  const [code, setCode] = useState<string | null>(null);
  const [letters, setLetters] = useState<Letter[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved =
      typeof window !== "undefined" ? localStorage.getItem(CODE_KEY) : null;
    setCode(saved);
    if (saved) {
      listLetters(saved)
        .then(setLetters)
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  return (
    <main className="relative min-h-dvh flex flex-col bg-paper text-ink">
      <PaperSurface />

      <header className="hairline-b">
        <div className="mx-auto max-w-[1240px] w-full px-6 sm:px-10 lg:px-16 py-5 sm:py-6 flex items-baseline gap-6">
          <Link
            href="/app"
            className="script text-[34px] sm:text-[40px] leading-none text-aubergine hover:text-violetInk transition-colors"
          >
            Vespers
          </Link>
          <span className="eyebrow hidden sm:inline">vol. iii · letters</span>
          <span className="flex-1" />
          <Link href="/app" className="eyebrow text-margin hover:text-aubergine transition-colors">
            ← back to chat
          </Link>
        </div>
      </header>

      <section className="flex-1 px-6 sm:px-10 lg:px-16 py-14 sm:py-20">
        <div className="mx-auto w-full max-w-[820px]">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="eyebrow mb-7">§ letters to yourself</div>
            <h1 className="display text-[clamp(34px,5.6vw,68px)] leading-[1.04] tracking-[-0.02em] text-ink">
              a quiet place
              <br />
              <span className="lowercase">to write what you need </span>
              <span className="script text-aubergine align-baseline mx-1 text-[1.05em]">
                to hear.
              </span>
            </h1>
            <p className="text-margin text-[15px] leading-[1.75] mt-9 max-w-md">
              letters live only with your recovery code. nothing is published.
              nothing is graded. write at your own pace.
            </p>
          </motion.div>

          <div className="mt-12 sm:mt-16 hairline pt-3 flex items-baseline justify-between">
            <div className="eyebrow">begin</div>
            <Link
              href="/letters/new"
              className="display italic text-[16px] text-aubergine hover:text-violetInk transition-colors"
            >
              write a new letter →
            </Link>
          </div>

          {!code ? (
            <p className="text-margin text-[15px] leading-[1.75] mt-10">
              no recovery code yet. start a chat first to receive one — your
              letters will be linked to it.
            </p>
          ) : loading ? (
            <p className="eyebrow text-margin mt-10">opening the drawer…</p>
          ) : letters.length === 0 ? (
            <p className="text-margin text-[15px] leading-[1.75] mt-10">
              nothing here yet. when you're ready.
            </p>
          ) : (
            <ol className="mt-10">
              {letters.map((l, i) => {
                const label =
                  l.mode === "custom" && l.custom_mode
                    ? l.custom_mode
                    : MODE_LABEL[l.mode];
                return (
                  <li key={l.id} className="hairline">
                    <Link
                      href={`/letters/${l.id}`}
                      className="grid grid-cols-[44px_1fr_120px] gap-x-4 py-5 group items-baseline"
                    >
                      <span className="eyebrow tabular-nums text-margin/80 group-hover:text-aubergine transition-colors">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <div>
                        <div className="display italic text-[16.5px] text-ink/90 group-hover:text-aubergine transition-colors">
                          {label}
                        </div>
                        <p className="text-margin text-[13.5px] leading-[1.6] mt-1">
                          {preview(l.content)}
                        </p>
                      </div>
                      <div className="eyebrow text-margin/80 text-right">
                        {formatDate(l.updated_at)}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </section>
    </main>
  );
}
