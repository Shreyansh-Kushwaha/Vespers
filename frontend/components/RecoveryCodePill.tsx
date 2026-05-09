"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

interface Props {
  code: string | null;
  onUseCode: (code: string) => void;
  onStartNew: () => void;
  onForget: () => void;
}

export function RecoveryCodePill({ code, onUseCode, onStartNew, onForget }: Props) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [copied, setCopied] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Close on outside click and on Escape.
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent | TouchEvent) => {
      const el = wrapRef.current;
      if (!el) return;
      if (el.contains(e.target as Node)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("touchstart", onPointer, { passive: true });
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("touchstart", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function copy() {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2.5 eyebrow text-ink hover:text-aubergine transition-colors"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-aubergine animate-pulse-soft" />
        {code ? (
          <span className="font-mono tracking-[0.18em] normal-case">{code}</span>
        ) : (
          "no recovery code yet"
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 top-[180%] w-[22rem] bg-paperDeep border border-rule shadow-[0_30px_60px_-40px_rgba(11,26,51,0.35)] p-5 z-30"
          >
            <div className="eyebrow mb-2.5">recovery code</div>
            <p className="text-[12.5px] text-margin leading-snug mb-4">
              save this code privately. paste it back anytime to continue with your
              emotional context.
            </p>

            {code ? (
              <div className="flex items-center gap-3 mb-1 hairline-b pb-3">
                <code className="flex-1 font-mono text-[12px] tracking-[0.22em] text-ink">
                  {code}
                </code>
                <button onClick={copy} className="eyebrow text-aubergine hover:text-violetInk transition-colors">
                  {copied ? "copied" : "copy"}
                </button>
              </div>
            ) : (
              <p className="text-[12px] text-margin/80 mb-1 hairline-b pb-3">
                a code is generated on your first message.
              </p>
            )}

            <div className="pt-4">
              <div className="eyebrow mb-2.5">continue a session</div>
              <div className="flex items-center gap-3">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="VESP-XXXX-XXXX"
                  className="flex-1 bg-transparent border-b border-rule outline-none py-1.5 font-mono text-[12px] tracking-[0.22em] text-ink placeholder:text-margin/60 focus:border-aubergine"
                />
                <button
                  onClick={() => {
                    if (input.trim()) {
                      onUseCode(input.trim());
                      setInput("");
                      setOpen(false);
                    }
                  }}
                  className="eyebrow text-aubergine hover:text-violetInk transition-colors"
                >
                  use →
                </button>
              </div>
            </div>

            {code && (
              <div className="hairline-t mt-5 pt-4 space-y-2.5">
                <button
                  onClick={() => {
                    onStartNew();
                    setOpen(false);
                  }}
                  className="block w-full text-left eyebrow text-ink hover:text-aubergine transition-colors"
                >
                  start a new private session
                </button>
                <p className="text-[11.5px] text-margin/80 leading-snug -mt-1">
                  clears this code from this device. the previous session stays
                  saved — paste the code back to return.
                </p>

                <button
                  onClick={() => {
                    onForget();
                    setOpen(false);
                  }}
                  className="block w-full text-left eyebrow text-margin/80 hover:text-aubergine transition-colors pt-2"
                >
                  forget this session permanently
                </button>
                <p className="text-[11.5px] text-margin/80 leading-snug -mt-1">
                  deletes the chat history from the server. cannot be undone.
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
