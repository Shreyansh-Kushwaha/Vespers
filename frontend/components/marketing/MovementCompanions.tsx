"use client";

import { Reveal } from "./Reveal";
import { SectionShell } from "./SectionShell";

/**
 * Introduces the second persona, Gappu, beside Vespers. Slotted right after
 * "the companion" so the reader has already met Vespers's voice before they
 * learn there's a louder one in the next room.
 *
 * Section number is "&" instead of a digit — it sits between 04 and 05
 * without renumbering anything in the existing essay.
 */
export function MovementCompanions() {
  return (
    <SectionShell number="&" title="and the other room">
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 md:col-start-2 md:col-span-10 lg:col-start-2 lg:col-span-9">
          <Reveal as="h2" className="display text-[clamp(28px,3.6vw,52px)] leading-[1.1] tracking-[-0.01em] text-ink">
            some nights the body wants&nbsp;
            <span className="script text-aubergine text-[1.05em]">quiet</span>.
            <br />
            other nights it wants&nbsp;
            <span
              className="script text-[1.05em]"
              style={{ color: "#B85A1E" }}
            >
              laughter
            </span>
            .
          </Reveal>

          <Reveal delay={0.1}>
            <p className="text-margin text-[14px] leading-relaxed mt-6 max-w-2xl">
              there are two companions inside vespers. you can switch between
              them at any time inside a session, on the same private thread.
            </p>
          </Reveal>
        </div>

        <div className="col-span-12 md:col-start-2 md:col-span-10 mt-12 sm:mt-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
            <Reveal>
              <CompanionCard
                kind="vespers"
                eyebrow="companion · i"
                heading="Vespers"
                tagline="calm, careful, listens for what's underneath."
                samplePrefix="vespers"
                sample={
                  "that sentence is heavy on its own. before we examine it, can we agree it isn't a verdict — it's a feeling, and feelings deserve to be looked at gently before they're argued with?"
                }
                cta="begin with vespers →"
              />
            </Reveal>
            <Reveal delay={0.08}>
              <CompanionCard
                kind="gappu"
                eyebrow="companion · ii"
                heading="Gappu"
                tagline="loud, lovely, talks in hinglish and roasts the situation."
                samplePrefix="gappu"
                sample={
                  "oye, kya scene hai? mood off ka full picture suna — chai utha, AC band kar, aur ek 7-minute walk maar without phone. wapas aake bata, lecture nahi dunga promise."
                }
                cta="begin with gappu →"
              />
            </Reveal>
          </div>
        </div>

        <div className="col-span-12 md:col-start-2 md:col-span-10 mt-10">
          <Reveal delay={0.16}>
            <p className="text-margin text-[12.5px] leading-relaxed max-w-2xl">
              one private recovery code, two voices. switch with a tap.
              <span className="opacity-70">
                {" "}if a message ever lands in real distress while gappu is on,
                vespers steps in for that turn — gently, without making a thing
                of it.
              </span>
            </p>
          </Reveal>
        </div>
      </div>
    </SectionShell>
  );
}

interface CardProps {
  kind: "vespers" | "gappu";
  eyebrow: string;
  heading: string;
  tagline: string;
  samplePrefix: string;
  sample: string;
  cta: string;
}

function CompanionCard({
  kind, eyebrow, heading, tagline, samplePrefix, sample, cta,
}: CardProps) {
  const isGappu = kind === "gappu";
  return (
    <div
      className={[
        "relative h-full flex flex-col px-7 py-8 sm:px-9 sm:py-10",
        "shadow-[0_30px_60px_-40px_rgba(22,20,18,0.4)]",
        isGappu
          ? "rounded-[14px] bg-gradient-to-br from-[#FFEAC0] via-[#FFD89A] to-[#FFC066] text-[#3a1f00]"
          : "border border-rule bg-paperDeep/60 text-ink",
      ].join(" ")}
    >
      <div className="flex items-center justify-between mb-6">
        <span
          className="eyebrow"
          style={isGappu ? { color: "#7A3304" } : undefined}
        >
          {eyebrow}
        </span>
        <span
          className="eyebrow"
          style={isGappu ? { color: "#7A3304", opacity: 0.7 } : undefined}
        >
          {isGappu ? "warm · hinglish" : "calm · english"}
        </span>
      </div>

      <h3
        className={[
          "script leading-none mb-4",
          isGappu ? "" : "text-aubergine",
        ].join(" ")}
        style={{
          fontSize: "clamp(40px, 4vw, 56px)",
          color: isGappu ? "#8a3a06" : undefined,
        }}
      >
        {heading}
      </h3>

      <p
        className={[
          "display text-[15px] sm:text-[16px] leading-snug mb-7",
          isGappu ? "" : "italic text-ink/85",
        ].join(" ")}
        style={isGappu ? { color: "#5a2a08" } : undefined}
      >
        {tagline}
      </p>

      <div
        className={isGappu ? "" : "hairline pt-5"}
        style={
          isGappu
            ? { borderTop: "1px solid rgba(122,51,4,0.25)", paddingTop: "20px" }
            : undefined
        }
      >
        <div className="grid grid-cols-[64px_1fr] gap-x-4">
          <span
            className="eyebrow pt-[6px]"
            style={isGappu ? { color: "#8a3a06" } : undefined}
          >
            {samplePrefix}
          </span>
          <p
            className={[
              "display text-[15px] sm:text-[16px] leading-[1.7]",
              isGappu ? "" : "text-inkSoft",
            ].join(" ")}
            style={isGappu ? { color: "#3a1f00" } : undefined}
          >
            {sample}
          </p>
        </div>
      </div>

      <div className="flex-1" />

      <div
        className={isGappu ? "mt-8" : "mt-8 hairline pt-5"}
        style={
          isGappu
            ? { marginTop: "32px", borderTop: "1px solid rgba(122,51,4,0.25)", paddingTop: "20px" }
            : undefined
        }
      >
        <a
          href="/app"
          className={[
            "ink-link display text-[15px] sm:text-[16px] tracking-tight no-underline",
            isGappu ? "" : "text-aubergine",
          ].join(" ")}
          style={isGappu ? { color: "#8a3a06" } : undefined}
        >
          {cta}
        </a>
      </div>
    </div>
  );
}
