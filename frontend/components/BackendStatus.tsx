"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

type Status = "idle" | "waking" | "settled" | "error";

const SHOW_AFTER_MS = 1500; // don't show toast for fast responses
const SETTLE_HOLD_MS = 1800; // briefly show "ready" only if we showed "waking"

/**
 * Quiet bottom-right toast that surfaces only when the backend is slow to
 * answer (Render free-tier cold-start). On hover, it expands to explain why.
 * On a fast cold path, it never appears at all.
 */
export function BackendStatus() {
  const [status, setStatus] = useState<Status>("idle");
  const [hovering, setHovering] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);

  useEffect(() => {
    let mounted = true;
    const startedAt = Date.now();

    // Tick a small "elapsed seconds" counter while we wait, only after the
    // toast has appeared.
    const elapsedTimer = setInterval(() => {
      if (!mounted) return;
      setElapsedSec(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);

    // If the health ping is still in-flight after this delay, surface the toast.
    const wakeTimer = setTimeout(() => {
      if (!mounted) return;
      setStatus((s) => (s === "idle" ? "waking" : s));
    }, SHOW_AFTER_MS);

    fetch("/api/health", { cache: "no-store" })
      .then((r) => r.ok)
      .then((ok) => {
        if (!mounted) return;
        clearTimeout(wakeTimer);
        const wasSlow = Date.now() - startedAt > SHOW_AFTER_MS;
        if (!ok) {
          setStatus("error");
          return;
        }
        if (wasSlow) {
          setStatus("settled");
          setTimeout(() => mounted && setStatus("idle"), SETTLE_HOLD_MS);
        } else {
          setStatus("idle");
        }
      })
      .catch(() => {
        if (!mounted) return;
        clearTimeout(wakeTimer);
        setStatus("error");
      });

    return () => {
      mounted = false;
      clearInterval(elapsedTimer);
      clearTimeout(wakeTimer);
    };
  }, []);

  const visible = status === "waking" || status === "settled" || status === "error";
  const isSettled = status === "settled";
  const isError = status === "error";

  const headline = isSettled
    ? "ready."
    : isError
      ? "couldn't reach the page."
      : "waking the page…";

  const detail = isSettled
    ? "the backend is awake and listening."
    : isError
      ? "the backend isn't responding. please try again in a moment, or refresh."
      : "the server takes a slow breath after a quiet stretch — usually 30 to 60 seconds. it's stretching now. nothing is broken.";

  return (
    <AnimatePresence>
      {visible && (
        <motion.aside
          key="backend-status"
          initial={{ opacity: 0, y: 14, filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: 8, filter: "blur(4px)" }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          onMouseEnter={() => setHovering(true)}
          onMouseLeave={() => setHovering(false)}
          onFocus={() => setHovering(true)}
          onBlur={() => setHovering(false)}
          tabIndex={0}
          role="status"
          aria-live="polite"
          className="fixed bottom-5 right-5 z-50 max-w-[320px] bg-paperDeep/95 backdrop-blur-[2px] border border-rule shadow-[0_18px_50px_-30px_rgba(11,26,51,0.4)] outline-none"
        >
          <div className="px-4 py-3.5 sm:px-5 sm:py-4">
            <div className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className={`h-2 w-2 rounded-full ${
                  isSettled
                    ? "bg-aubergine"
                    : isError
                      ? "bg-aubergine/60"
                      : "bg-aubergine animate-pulse-soft"
                }`}
              />
              <span className="eyebrow">{isError ? "offline" : "backend"}</span>
              {!isSettled && !isError && (
                <span className="ml-auto eyebrow tabular-nums text-margin/80">
                  {elapsedSec}s
                </span>
              )}
            </div>
            <p className="display italic text-[14.5px] leading-[1.6] text-ink/90 mt-2">
              {headline}
            </p>
            <AnimatePresence initial={false}>
              {(hovering || isError) && (
                <motion.p
                  key="detail"
                  initial={{ opacity: 0, height: 0, marginTop: 0 }}
                  animate={{ opacity: 1, height: "auto", marginTop: 8 }}
                  exit={{ opacity: 0, height: 0, marginTop: 0 }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden text-[12.5px] leading-[1.55] text-margin"
                >
                  {detail}
                </motion.p>
              )}
            </AnimatePresence>
            {!hovering && !isError && !isSettled && (
              <p className="text-[11px] leading-[1.4] text-margin/70 mt-1.5">
                hover for details
              </p>
            )}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
