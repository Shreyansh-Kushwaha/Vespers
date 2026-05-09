import type { ReactNode } from "react";
import { Reveal } from "./Reveal";

interface Props {
  id?: string;
  number: string; // "00", "01", …
  title: string;  // "the whisper"
  children: ReactNode;
  topRule?: boolean;
  className?: string;
}

export function SectionShell({
  id,
  number,
  title,
  children,
  topRule = true,
  className = "",
}: Props) {
  return (
    <section
      id={id}
      className={`relative w-full ${topRule ? "hairline" : ""} ${className}`}
    >
      <div className="mx-auto max-w-[1240px] px-6 sm:px-10 lg:px-16 pt-24 sm:pt-32 lg:pt-40 pb-20 sm:pb-28 lg:pb-32">
        <Reveal>
          <div className="eyebrow mb-10 sm:mb-14">
            § {number} &nbsp;—&nbsp; {title}
          </div>
        </Reveal>
        {children}
      </div>
    </section>
  );
}
