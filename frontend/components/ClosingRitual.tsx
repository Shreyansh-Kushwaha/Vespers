"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";

interface Props {
  open: boolean;
  onDismiss: () => void;
  onSubmit: (entries: {
    carrying: string;
    releasing: string;
    intention: string;
  }) => Promise<void>;
}

const PROMPTS = [
  { key: "carrying", label: "one thing you're carrying" },
  { key: "releasing", label: "one thing you're releasing" },
  { key: "intention", label: "one intention for tomorrow" },
] as const;

/**
 * A quiet end-of-session reflective close. Surfaces softly after a stretch of
 * inactivity. Three prompts, freely answered or skipped. Saves to the session
 * record when at least one field is filled.
 */
export function ClosingRitual({ open, onDismiss, onSubmit }: Props) {
  const [values, setValues] = useState<Record<string, string>>({
    carrying: "",
    releasing: "",
    intention: "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const hasAnything = Object.values(values).some((v) => v.trim().length > 0);

  const submit = async () => {
    if (!hasAnything || saving) return;
    setSaving(true);
    try {
      await onSubmit({
        carrying: values.carrying.trim(),
        releasing: values.releasing.trim(),
        intention: values.intention.trim(),
      });
      setSaved(true);
      setTimeout(onDismiss, 1200);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="closing"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          className="fixed inset-0 z-40 bg-paper/85 backdrop-blur-[2px] flex items-center justify-center px-6"
          onClick={onDismiss}
        >
          <motion.div
            initial={{ y: 20, opacity: 0, filter: "blur(6px)" }}
            animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
            exit={{ y: 8, opacity: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="bg-paperDeep/90 border border-rule px-7 sm:px-10 py-9 sm:py-12 max-w-[640px] w-full"
          >
            <div className="eyebrow mb-6">§ a quiet close</div>
            <h2 className="display text-[clamp(24px,4vw,34px)] leading-[1.15] tracking-[-0.01em] text-ink mb-2">
              before you go,
            </h2>
            <p className="display italic text-[15px] leading-[1.7] text-margin mb-8">
              three small lines, only if they help.
            </p>

            <div className="space-y-6">
              {PROMPTS.map((p) => (
                <label key={p.key} className="block hairline pt-3">
                  <span className="eyebrow mb-2 block">{p.label}</span>
                  <textarea
                    value={values[p.key]}
                    onChange={(e) =>
                      setValues((v) => ({ ...v, [p.key]: e.target.value }))
                    }
                    rows={2}
                    placeholder=""
                    className="w-full resize-none bg-transparent outline-none placeholder:text-margin/60 text-ink display italic text-[15.5px] leading-[1.7]"
                  />
                </label>
              ))}
            </div>

            <div className="mt-9 flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={onDismiss}
                className="eyebrow text-margin hover:text-aubergine transition-colors"
              >
                not tonight
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={!hasAnything || saving}
                className="display italic text-[15px] sm:text-[16px] text-aubergine hover:text-violetInk transition-colors disabled:text-margin/50 disabled:cursor-not-allowed"
              >
                {saved ? "kept ✓" : saving ? "keeping…" : "keep these →"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
