"use client";

import { motion } from "framer-motion";

export type Persona = "vespers" | "gappu";

interface Props {
  value: Persona;
  onChange: (p: Persona) => void;
  disabled?: boolean;
}

/**
 * Two pill buttons for switching between the calm Vespers therapist and the
 * Hinglish chatterbox Gappu. The selected pill has a soft animated background;
 * the other is a flat link. Designed to live in the chat header without
 * stealing the eye from the recovery-code pill.
 */
export function PersonaToggle({ value, onChange, disabled }: Props) {
  return (
    <div
      role="radiogroup"
      aria-label="conversation companion"
      className="relative inline-flex items-center gap-1 rounded-full hairline px-1 py-1"
    >
      <PersonaPill
        active={value === "vespers"}
        onClick={() => !disabled && onChange("vespers")}
        disabled={disabled}
        label="Vespers"
        tag="calm"
        flavor="vespers"
      />
      <PersonaPill
        active={value === "gappu"}
        onClick={() => !disabled && onChange("gappu")}
        disabled={disabled}
        label="Gappu"
        tag="mood lift"
        flavor="gappu"
      />
    </div>
  );
}

interface PillProps {
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
  label: string;
  tag: string;
  flavor: Persona;
}

function PersonaPill({ active, onClick, disabled, label, tag, flavor }: PillProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      disabled={disabled}
      onClick={onClick}
      className={[
        "relative isolate inline-flex items-center gap-2 rounded-full px-3 sm:px-4 py-1.5",
        "text-[12px] sm:text-[12.5px] uppercase tracking-[0.2em] transition-colors",
        active
          ? flavor === "gappu"
            ? "text-[#3a1f00]"
            : "text-paper"
          : "text-margin hover:text-aubergine",
        disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer",
      ].join(" ")}
      style={{ fontFamily: "var(--font-mono)" }}
    >
      {active && (
        <motion.span
          layoutId="persona-pill-bg"
          aria-hidden
          className="absolute inset-0 -z-10 rounded-full"
          style={{
            background:
              flavor === "gappu"
                ? "linear-gradient(135deg, #F4B860, #E07A2C 80%)"
                : "linear-gradient(135deg, #4A2A4F, #322A6E)",
          }}
          transition={{ type: "spring", stiffness: 380, damping: 32 }}
        />
      )}
      <span>{label}</span>
      <span className={active ? "opacity-80" : "opacity-60"}>·</span>
      <span className={active ? "opacity-90" : "opacity-70"}>{tag}</span>
    </button>
  );
}
