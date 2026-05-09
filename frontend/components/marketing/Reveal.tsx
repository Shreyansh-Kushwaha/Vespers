"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
  delay?: number;
  y?: number;
  blur?: number;
  duration?: number;
  className?: string;
  once?: boolean;
  as?: "div" | "section" | "p" | "h2" | "h3" | "li" | "span";
}

export function Reveal({
  children,
  delay = 0,
  y = 12,
  blur = 6,
  duration = 0.7,
  className,
  once = true,
  as = "div",
}: Props) {
  const reduced = useReducedMotion();
  const Tag = motion[as];

  if (reduced) {
    return <Tag className={className}>{children}</Tag>;
  }

  return (
    <Tag
      className={className}
      initial={{ opacity: 0, y, filter: `blur(${blur}px)` }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once, margin: "-10% 0px -10% 0px" }}
      transition={{
        duration,
        delay,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      {children}
    </Tag>
  );
}
