"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { PaperSurface } from "@/components/marketing/PaperSurface";
import { createLetter, type LetterMode, MODE_LABEL } from "@/lib/letters";

const CODE_KEY = "vespers.code";

const MODES: { mode: LetterMode; descriptor: string }[] = [
  { mode: "grief", descriptor: "for what you've lost or are losing." },
  { mode: "burnout", descriptor: "for the tired part of you that needs rest." },
  { mode: "anxiety", descriptor: "for the noise that's been louder than thought." },
  { mode: "shame", descriptor: "for the part of you that flinches at itself." },
  { mode: "encouragement", descriptor: "what you wish someone would say." },
  { mode: "forgiveness", descriptor: "for a version of you you can release." },
  { mode: "custom", descriptor: "name it your own way." },
];

export default function NewLetterPage() {
  const router = useRouter();
  const [code, setCode] = useState<string | null>(null);
  const [customLabel, setCustomLabel] = useState("");
  const [busy, setBusy] = useState<LetterMode | null>(null);

  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem(CODE_KEY) : null;
    setCode(saved);
  }, []);

  const begin = async (mode: LetterMode) => {
    if (!code || busy) return;
    setBusy(mode);
    const letter = await createLetter(
      code,
      mode,
      mode === "custom" ? customLabel.trim() : undefined,
    );
    if (letter) router.push(`/letters/${letter.id}`);
    else setBusy(null);
  };

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
          <span className="eyebrow hidden sm:inline">vol. iii · new letter</span>
          <span className="flex-1" />
          <Link href="/letters" className="eyebrow text-margin hover:text-aubergine transition-colors">
            ← all letters
          </Link>
        </div>
      </header>

      <section className="flex-1 px-6 sm:px-10 lg:px-16 py-14 sm:py-20">
        <div className="mx-auto w-full max-w-[820px]">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="eyebrow mb-7">§ choose a doorway</div>
            <h1 className="display text-[clamp(30px,5vw,56px)] leading-[1.06] tracking-[-0.02em]">
              what kind of letter
              <br />
              <span className="script text-aubergine">is asking to be written?</span>
            </h1>
          </motion.div>

          {!code ? (
            <p className="text-margin text-[15px] leading-[1.75] mt-12">
              you'll need a recovery code first. start a brief chat in{" "}
              <Link href="/app" className="ink-link">the session room</Link> and one
              will be created for you.
            </p>
          ) : (
            <ol className="mt-12">
              {MODES.map((m, i) => (
                <li key={m.mode} className="hairline">
                  <button
                    type="button"
                    onClick={() => m.mode !== "custom" && begin(m.mode)}
                    disabled={busy !== null && busy !== m.mode}
                    className="w-full text-left py-6 grid grid-cols-[44px_1fr_auto] gap-x-4 group items-baseline disabled:opacity-50"
                  >
                    <span className="eyebrow tabular-nums text-margin/80 group-hover:text-aubergine transition-colors">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <div className="display italic text-[18px] text-ink/90 group-hover:text-aubergine transition-colors">
                        {MODE_LABEL[m.mode]}
                      </div>
                      <p className="text-margin text-[13.5px] leading-[1.6] mt-1.5">
                        {m.descriptor}
                      </p>
                    </div>
                    <span className="eyebrow text-margin/70 group-hover:text-aubergine transition-colors">
                      {busy === m.mode ? "opening…" : "begin →"}
                    </span>
                  </button>

                  {m.mode === "custom" && (
                    <div className="grid grid-cols-[44px_1fr_auto] gap-x-4 pb-6 -mt-2 items-center">
                      <span />
                      <input
                        value={customLabel}
                        onChange={(e) => setCustomLabel(e.target.value)}
                        placeholder="name your own subject…"
                        maxLength={60}
                        className="bg-transparent outline-none border-b border-rule focus:border-aubergine/50 transition-colors py-2 text-ink display italic text-[15.5px] placeholder:text-margin/60"
                      />
                      <button
                        type="button"
                        onClick={() => begin("custom")}
                        disabled={!customLabel.trim() || busy !== null}
                        className="display italic text-[15px] text-aubergine hover:text-violetInk transition-colors disabled:text-margin/50 disabled:cursor-not-allowed"
                      >
                        {busy === "custom" ? "opening…" : "begin →"}
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ol>
          )}
        </div>
      </section>
    </main>
  );
}
