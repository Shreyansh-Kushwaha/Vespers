"use client";

import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export type ChatRole = "user" | "assistant" | "system";
export type Persona = "vespers" | "gappu";

interface Props {
  role: ChatRole;
  content: string;
  pending?: boolean;
  persona?: Persona;
}

export function MessageBubble({ role, content, pending, persona }: Props) {
  const isUser = role === "user";
  const isSystem = role === "system";
  const isGappu = persona === "gappu" && role === "assistant";

  // System notices are a slim, centered line — not a chat bubble. Used for
  // persona-switch announcements.
  if (isSystem) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="py-4 flex justify-center"
      >
        <span
          className="eyebrow text-margin/80 text-center"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          {content}
        </span>
      </motion.div>
    );
  }

  const label = isUser ? "you" : isGappu ? "gappu" : "vespers";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, filter: "blur(6px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="grid grid-cols-[56px_1fr] sm:grid-cols-[80px_1fr] gap-x-5 sm:gap-x-8 hairline pt-5 sm:pt-6 pb-6 sm:pb-7"
    >
      <span
        className={[
          "eyebrow pt-[7px]",
          isGappu ? "text-[#B85A1E]" : "",
        ].join(" ")}
      >
        {label}
      </span>
      <div>
        {pending && !content ? (
          <div className="flex items-center gap-1.5 py-2">
            <span className="dot-paper" />
            <span className="dot-paper" />
            <span className="dot-paper" />
          </div>
        ) : isUser ? (
          <p className="display whitespace-pre-wrap break-words text-[16px] sm:text-[17px] leading-[1.7] italic text-ink/90">
            {content}
          </p>
        ) : isGappu ? (
          <div
            className={[
              "relative break-words text-[16.5px] sm:text-[17.5px] leading-[1.65]",
              "rounded-[14px] rounded-tl-[4px] px-5 sm:px-6 py-4 sm:py-5",
              // warm saffron/marigold wash, generous corner radius (more playful)
              "bg-gradient-to-br from-[#FFE7B8] via-[#FFD89A] to-[#FFC066]",
              "text-[#3a1f00]",
              "shadow-[0_1px_0_rgba(184,90,30,0.18)]",
              "[&_p]:mt-0 [&_p+p]:mt-2.5",
              "[&_strong]:font-semibold [&_strong]:text-[#8a3a06]",
              "[&_em]:italic",
              "[&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:my-3 [&_ol]:space-y-1.5",
              "[&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-3 [&_ul]:space-y-1.5",
              "[&_li]:pl-1 [&_li_p]:my-0",
              "[&_a]:text-[#8a3a06] [&_a]:underline [&_a]:underline-offset-2",
              "[&_code]:font-mono [&_code]:text-[0.9em] [&_code]:bg-black/[0.06] [&_code]:px-1 [&_code]:py-[1px] [&_code]:rounded",
              // larger emoji size so dad-jokes land
              "[&_p]:[&_*]:text-[1.05em]",
            ].join(" ")}
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
          </div>
        ) : (
          <div
            className={[
              "display break-words text-[16px] sm:text-[17px] leading-[1.7] text-inkSoft",
              "[&_p]:mt-0 [&_p+p]:mt-3",
              "[&_strong]:font-semibold [&_strong]:text-aubergine",
              "[&_em]:italic",
              "[&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:my-3 [&_ol]:space-y-1.5",
              "[&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-3 [&_ul]:space-y-1.5",
              "[&_li]:pl-1",
              "[&_li_p]:my-0",
              "[&_h1]:display [&_h1]:text-[20px] [&_h1]:text-ink [&_h1]:mt-4 [&_h1]:mb-2",
              "[&_h2]:display [&_h2]:text-[18px] [&_h2]:text-ink [&_h2]:mt-4 [&_h2]:mb-2",
              "[&_h3]:eyebrow [&_h3]:text-margin [&_h3]:mt-4 [&_h3]:mb-2",
              "[&_blockquote]:border-l-2 [&_blockquote]:border-aubergine/30 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-ink/80",
              "[&_code]:font-mono [&_code]:text-[0.9em] [&_code]:bg-ink/[0.04] [&_code]:px-1 [&_code]:py-[1px] [&_code]:rounded",
              "[&_a]:text-aubergine [&_a]:underline [&_a]:underline-offset-2",
              "[&_hr]:my-5 [&_hr]:border-ink/10",
            ].join(" ")}
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
          </div>
        )}
      </div>
    </motion.div>
  );
}
