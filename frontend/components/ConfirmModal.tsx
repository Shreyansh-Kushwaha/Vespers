"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";

interface Props {
  open: boolean;
  title: string;
  body: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  open,
  title,
  body,
  confirmLabel = "confirm",
  cancelLabel = "cancel",
  onConfirm,
  onCancel,
}: Props) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="confirm-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center px-6"
          onClick={(e) => {
            if (e.target === e.currentTarget) onCancel();
          }}
        >
          <div className="absolute inset-0 bg-ink/20" aria-hidden />
          <motion.div
            initial={{ opacity: 0, y: 12, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            className="relative w-full max-w-sm bg-paperDeep border border-rule shadow-[0_40px_80px_-40px_rgba(11,26,51,0.4)] p-6 sm:p-7"
          >
            <div id="confirm-title" className="eyebrow mb-3">{title}</div>
            <p className="text-[14px] text-inkSoft leading-[1.7] mb-6">{body}</p>
            <div className="flex items-center justify-end gap-6">
              <button
                ref={cancelRef}
                onClick={onCancel}
                className="eyebrow text-margin hover:text-ink transition-colors"
              >
                {cancelLabel}
              </button>
              <button
                onClick={onConfirm}
                className="eyebrow text-aubergine hover:text-violetInk transition-colors"
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
