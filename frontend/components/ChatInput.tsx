"use client";

import { useEffect, useRef } from "react";

interface Props {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
}

/**
 * Paper-themed input. A single ink-on-paper field with a hairline rule and an
 * editorial "send →" link instead of a button.
 */
export function ChatInput({ value, onChange, onSubmit, disabled }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  }, [value]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!disabled && value.trim()) onSubmit();
      }}
      className="bg-paperDeep/80 border border-rule px-5 sm:px-6 py-4 sm:py-5 flex items-end gap-5 transition-colors focus-within:border-ink/40"
    >
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (!disabled && value.trim()) onSubmit();
          }
        }}
        placeholder="write what's true — even crooked, even half-formed."
        rows={1}
        className="flex-1 resize-none bg-transparent outline-none placeholder:text-margin/70 text-ink display italic text-[16px] sm:text-[17px] leading-[1.7] max-h-48"
      />
      <button
        type="submit"
        disabled={disabled || !value.trim()}
        aria-label="Send"
        className="shrink-0 self-end pb-[2px] display italic text-[15px] sm:text-[16px] text-aubergine hover:text-violetInk transition-colors disabled:text-margin/50 disabled:cursor-not-allowed"
      >
        send&nbsp;→
      </button>
    </form>
  );
}
