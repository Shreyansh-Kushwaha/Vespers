"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { PaperSurface } from "@/components/marketing/PaperSurface";
import {
  fetchEmotionCatalog,
  writeEmotion,
  type EmotionSelection,
  type Primary,
  type Secondary,
  type Tertiary,
} from "@/lib/emotions";

const CODE_KEY = "vespers.code";

type Step = "primary" | "secondary" | "tertiary" | "detail";

export default function FeelPage() {
  const router = useRouter();
  const [catalog, setCatalog] = useState<Primary[] | null>(null);
  const [primary, setPrimary] = useState<Primary | null>(null);
  const [secondary, setSecondary] = useState<Secondary | null>(null);
  const [tertiary, setTertiary] = useState<Tertiary | null>(null);

  useEffect(() => {
    let mounted = true;
    fetchEmotionCatalog().then((c) => {
      if (mounted) setCatalog(c);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const step: Step = tertiary
    ? "detail"
    : secondary
      ? "tertiary"
      : primary
        ? primary.secondaries.length
          ? "secondary"
          : "detail"
        : "primary";

  function pickPrimary(p: Primary) {
    setPrimary(p);
    setSecondary(null);
    setTertiary(null);
  }
  function pickSecondary(s: Secondary) {
    setSecondary(s);
    setTertiary(null);
  }
  function pickTertiary(t: Tertiary) {
    setTertiary(t);
  }
  function back() {
    if (tertiary) setTertiary(null);
    else if (secondary) setSecondary(null);
    else if (primary) setPrimary(null);
  }

  function handoff() {
    if (!primary) return;
    const code = typeof localStorage !== "undefined" ? localStorage.getItem(CODE_KEY) : null;
    const sel: EmotionSelection = {
      primary: primary.key,
      secondary: secondary?.key,
      tertiary: tertiary?.key,
    };
    writeEmotion(code, sel);
    router.push("/app");
  }

  return (
    <div className="min-h-screen w-full">
      <PaperSurface />
      <div className="mx-auto max-w-3xl px-6 py-10 sm:py-16">
        <header className="mb-8 flex items-center justify-between">
          <Link href="/" className="eyebrow ink-link">
            ← vespers
          </Link>
          <div className="eyebrow">name the feeling</div>
        </header>

        <div className="hairline-b mb-8 pb-3">
          <h1 className="display text-3xl sm:text-4xl leading-tight">
            What <em>exactly</em> are you feeling?
          </h1>
          <p className="mt-3 text-sm opacity-70">
            Not "what happened" — what's the feeling underneath. Pick what's
            closest. You can go deeper, or stop anywhere.
          </p>
        </div>

        {!catalog && (
          <div className="opacity-60 text-sm">loading the wheel…</div>
        )}

        {catalog && (
          <>
            <Breadcrumb
              primary={primary}
              secondary={secondary}
              tertiary={tertiary}
              onJump={(level) => {
                if (level === "primary") {
                  setPrimary(null);
                  setSecondary(null);
                  setTertiary(null);
                } else if (level === "secondary") {
                  setSecondary(null);
                  setTertiary(null);
                } else if (level === "tertiary") {
                  setTertiary(null);
                }
              }}
            />

            <AnimatePresence mode="wait">
              {step === "primary" && (
                <Grid key="p">
                  {catalog.map((p) => (
                    <Card
                      key={p.key}
                      title={`${p.emoji} ${p.label}`}
                      body={p.definition}
                      onClick={() => pickPrimary(p)}
                    />
                  ))}
                </Grid>
              )}

              {step === "secondary" && primary && (
                <Grid key="s">
                  {primary.secondaries.map((s) => (
                    <Card
                      key={s.key}
                      title={s.label}
                      body={s.definition}
                      onClick={() => pickSecondary(s)}
                    />
                  ))}
                </Grid>
              )}

              {step === "tertiary" && secondary && (
                <Grid key="t">
                  {secondary.tertiaries.map((t) => (
                    <Card
                      key={t.key}
                      title={t.label}
                      body={t.definition}
                      onClick={() => pickTertiary(t)}
                    />
                  ))}
                </Grid>
              )}

              {step === "detail" && primary && (
                <Detail
                  key="d"
                  primary={primary}
                  secondary={secondary}
                  tertiary={tertiary}
                  onTalk={handoff}
                />
              )}
            </AnimatePresence>

            <div className="mt-8 flex items-center gap-4 text-sm">
              {primary && (
                <button
                  onClick={back}
                  className="ink-link"
                  aria-label="back one step"
                >
                  ← back
                </button>
              )}
              <Link href="/app" className="ink-link opacity-70">
                skip — just talk
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Breadcrumb({
  primary,
  secondary,
  tertiary,
  onJump,
}: {
  primary: Primary | null;
  secondary: Secondary | null;
  tertiary: Tertiary | null;
  onJump: (level: "primary" | "secondary" | "tertiary") => void;
}) {
  if (!primary) return null;
  return (
    <div className="eyebrow mb-6 flex flex-wrap items-center gap-2">
      <button onClick={() => onJump("primary")} className="ink-link">
        {primary.label}
      </button>
      {secondary && (
        <>
          <span className="opacity-50">→</span>
          <button onClick={() => onJump("secondary")} className="ink-link">
            {secondary.label}
          </button>
        </>
      )}
      {tertiary && (
        <>
          <span className="opacity-50">→</span>
          <button onClick={() => onJump("tertiary")} className="ink-link">
            {tertiary.label}
          </button>
        </>
      )}
    </div>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.25 }}
      className="grid grid-cols-1 sm:grid-cols-2 gap-3"
    >
      {children}
    </motion.div>
  );
}

function Card({
  title,
  body,
  onClick,
}: {
  title: string;
  body: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="text-left rounded-lg border border-[rgba(11,26,51,0.15)] bg-[rgba(255,255,255,0.45)] hover:bg-[rgba(255,255,255,0.7)] transition-colors p-4"
    >
      <div className="display text-lg leading-tight">{title}</div>
      <div className="mt-1 text-sm opacity-75">{body}</div>
    </button>
  );
}

function Detail({
  primary,
  secondary,
  tertiary,
  onTalk,
}: {
  primary: Primary;
  secondary: Secondary | null;
  tertiary: Tertiary | null;
  onTalk: () => void;
}) {
  const node = tertiary ?? secondary ?? primary;
  const label =
    "label" in node ? (node as { label: string }).label : primary.label;
  const definition =
    "definition" in node ? (node as { definition: string }).definition : primary.definition;
  const activity = tertiary?.activity;
  const meditation = tertiary?.meditation;
  const exercise = tertiary?.exercise;
  const quietObject = tertiary?.quietObject;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.25 }}
      className="rounded-lg border border-[rgba(11,26,51,0.15)] bg-[rgba(255,255,255,0.55)] p-6"
    >
      <div className="eyebrow mb-2">most-specific feeling</div>
      <h2 className="display text-2xl leading-tight">{label}</h2>
      <p className="mt-2 text-sm opacity-80">{definition}</p>

      {activity && (
        <Section title="An activity that fits">
          <div className="font-medium">{activity.name}</div>
          <div className="opacity-80">{activity.description}</div>
        </Section>
      )}
      {meditation && (
        <Section title="A meditation to try">
          <div className="font-medium">{meditation.name}</div>
          <div className="opacity-80">{meditation.description}</div>
        </Section>
      )}
      {exercise && (
        <Section title="One physical step">
          <div className="opacity-80">{exercise}</div>
        </Section>
      )}
      {quietObject && (
        <Section title="A quiet object">
          <Link href={`/play/${quietObject}`} className="ink-link">
            open the {quietObject}
          </Link>
        </Section>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          onClick={onTalk}
          className="rounded-md bg-[#0B1A33] text-[#FFE6C9] px-4 py-2 text-sm hover:opacity-90"
        >
          talk to vespers about this →
        </button>
      </div>
    </motion.div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-5">
      <div className="eyebrow mb-1">{title}</div>
      <div className="text-sm">{children}</div>
    </div>
  );
}
