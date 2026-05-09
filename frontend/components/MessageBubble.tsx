"use client";

import { motion } from "framer-motion";

export type ChatRole = "user" | "assistant";

interface Props {
  role: ChatRole;
  content: string;
  pending?: boolean;
}

/**
 * Transcript-style entry — paper theme. No bubbles. The speaker label sits in
 * the left margin (eyebrow caps), the message in the display serif on a
 * hairline-separated row.
 */
export function MessageBubble({ role, content, pending }: Props) {
  const label = role === "user" ? "you" : "vespers";
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, filter: "blur(6px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="grid grid-cols-[56px_1fr] sm:grid-cols-[80px_1fr] gap-x-5 sm:gap-x-8 hairline pt-5 sm:pt-6 pb-6 sm:pb-7"
    >
      <span className="eyebrow pt-[7px]">{label}</span>
      <div>
        {pending && !content ? (
          <div className="flex items-center gap-1.5 py-2">
            <span className="dot-paper" />
            <span className="dot-paper" />
            <span className="dot-paper" />
          </div>
        ) : (
          <p
            className={`display whitespace-pre-wrap break-words text-[16px] sm:text-[17px] leading-[1.7] ${
              role === "user" ? "italic text-ink/90" : "text-inkSoft"
            }`}
          >
            {content}
          </p>
        )}
      </div>
    </motion.div>
  );
}
