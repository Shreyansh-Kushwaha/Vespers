"use client";

interface Props {
  className?: string;
}

/**
 * The calligraphic "Vespers" wordmark. Renders the word in the Allura script
 * with a left-to-right clip-path wipe-in (acts like a stroke-draw without
 * needing a hand-traced SVG path) plus a subtle ink-bleed gradient.
 *
 * The visible span carries the visual; the offscreen span carries the
 * accessible text.
 */
export function WordmarkVespers({ className = "" }: Props) {
  return (
    <h1 className={`relative leading-none text-center md:text-left ${className}`}>
      <span className="sr-only">Vespers</span>
      <span
        aria-hidden
        className="script wordmark-wipe block text-[19vw] sm:text-[17vw] lg:text-[14rem] xl:text-[16rem] bg-gradient-to-r from-aubergine to-violetInk bg-clip-text text-transparent"
        style={{ paddingBottom: "0.32em" }}
      >
        Vespers
      </span>
    </h1>
  );
}
