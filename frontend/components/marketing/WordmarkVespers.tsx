"use client";

interface Props {
  className?: string;
}

export function WordmarkVespers({ className = "" }: Props) {
  return (
    <h1
      className={`relative leading-none w-full text-center md:text-left ${className}`}
    >
      <span className="sr-only">Vespers</span>
      <span
        aria-hidden
        // 1. Increased base text from 14vw to 26vw for a much larger mobile impact
        // 2. Adjusted sm:text to 20vw so it scales down slightly relative to screen width on tablets, 
        //    preventing it from overflowing before the desktop breakpoints kick in.
        className="script wordmark-wipe inline-block text-[26vw] sm:text-[20vw] lg:text-[14rem] xl:text-[16rem] bg-gradient-to-r from-aubergine to-violetInk bg-clip-text text-transparent"
        style={{ paddingBottom: "0.32em" }}
      >
        Vespers
      </span>
    </h1>
  );
}