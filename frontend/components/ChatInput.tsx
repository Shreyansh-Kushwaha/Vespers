"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiUrl } from "@/lib/api";

interface Props {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
}

type MicState = "idle" | "recording" | "transcribing";

function pickMimeType(): string {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/mp4",
  ];
  if (typeof MediaRecorder === "undefined") return "";
  for (const t of candidates) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return "";
}

export function ChatInput({ value, onChange, onSubmit, disabled }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const baseTextRef = useRef<string>("");
  const [micState, setMicState] = useState<MicState>("idle");
  const [supported, setSupported] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);

  useEffect(() => {
    setSupported(
      typeof window !== "undefined" &&
        typeof MediaRecorder !== "undefined" &&
        !!navigator.mediaDevices?.getUserMedia,
    );
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  }, [value]);

  useEffect(() => {
    return () => {
      recorderRef.current?.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const stopRecording = useCallback(() => {
    recorderRef.current?.stop();
  }, []);

  const startRecording = useCallback(async () => {
    setMicError(null);
    if (typeof window !== "undefined" && !window.isSecureContext) {
      setMicError("microphone needs https — open over the forwarded https url");
      return;
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      const name = err instanceof Error ? err.name : String(err);
      if (name === "NotAllowedError") {
        setMicError("microphone permission denied — click the lock icon to allow it");
      } else if (name === "NotFoundError") {
        setMicError("no microphone detected — check your input device");
      } else {
        setMicError(`mic unavailable: ${name}`);
      }
      return;
    }

    const mimeType = pickMimeType();
    let mr: MediaRecorder;
    try {
      mr = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
    } catch (err) {
      stream.getTracks().forEach((t) => t.stop());
      setMicError(err instanceof Error ? err.message : "recorder failed to start");
      return;
    }

    chunksRef.current = [];
    baseTextRef.current = value ? value.trimEnd() + " " : "";
    streamRef.current = stream;
    recorderRef.current = mr;

    mr.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
    };
    mr.onstop = async () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      const blob = new Blob(chunksRef.current, {
        type: mr.mimeType || mimeType || "audio/webm",
      });
      chunksRef.current = [];
      if (blob.size === 0) {
        setMicState("idle");
        setMicError("no audio captured — try again");
        return;
      }
      setMicState("transcribing");
      const fd = new FormData();
      const ext = (blob.type.split("/")[1] || "webm").split(";")[0];
      fd.append("audio", blob, `audio.${ext}`);
      try {
        const res = await fetch(apiUrl("/api/transcribe"), {
          method: "POST",
          body: fd,
        });
        if (!res.ok) {
          const err = await res.text().catch(() => "");
          setMicError(err || `transcription failed (${res.status})`);
        } else {
          const data = (await res.json()) as { text?: string };
          const text = (data.text || "").trim();
          if (text) {
            const combined = (baseTextRef.current + text).replace(/\s+/g, " ").trim();
            onChange(combined);
          }
        }
      } catch (err) {
        setMicError(err instanceof Error ? err.message : "transcription request failed");
      } finally {
        setMicState("idle");
      }
    };

    try {
      mr.start();
      setMicState("recording");
    } catch (err) {
      stream.getTracks().forEach((t) => t.stop());
      setMicError(err instanceof Error ? err.message : "could not start recorder");
      setMicState("idle");
    }
  }, [onChange, value]);

  const toggleMic = useCallback(() => {
    if (micState === "recording") stopRecording();
    else if (micState === "idle") startRecording();
  }, [micState, startRecording, stopRecording]);

  const listening = micState === "recording";
  const transcribing = micState === "transcribing";

  return (
    <div className="space-y-2">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!disabled && value.trim()) onSubmit();
        }}
        className="bg-paperDeep/80 border border-rule px-5 sm:px-6 py-4 sm:py-5 flex items-end gap-4 transition-colors focus-within:border-ink/40"
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
          placeholder={
            transcribing ? "transcribing…" : "write what's true — even crooked, even half-formed."
          }
          rows={1}
          className="flex-1 resize-none bg-transparent outline-none placeholder:text-margin/70 text-ink display italic text-[16px] sm:text-[17px] leading-[1.7] max-h-48"
        />
        {supported && (
          <button
            type="button"
            onClick={toggleMic}
            disabled={(disabled && !listening) || transcribing}
            aria-label={listening ? "Stop recording" : "Start recording"}
            aria-pressed={listening}
            title={
              listening
                ? "stop recording"
                : transcribing
                  ? "transcribing…"
                  : "speak instead of typing"
            }
            className={`relative shrink-0 self-end pb-[2px] w-9 h-9 -mb-1 grid place-items-center rounded-full border transition-colors ${
              listening
                ? "border-red-600 bg-red-600 text-white shadow-[0_0_0_3px_rgba(220,38,38,0.18)]"
                : transcribing
                  ? "border-aubergine/40 text-aubergine"
                  : "border-rule text-margin hover:text-aubergine hover:border-aubergine/50"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {listening && (
              <>
                <span
                  aria-hidden="true"
                  className="absolute inset-0 rounded-full bg-red-500/60 animate-ping"
                />
                <span
                  aria-hidden="true"
                  className="absolute -inset-1 rounded-full border border-red-500/40 animate-pulse"
                />
              </>
            )}
            {listening ? (
              <span
                aria-hidden="true"
                className="relative w-3 h-3 rounded-[2px] bg-white"
              />
            ) : transcribing ? (
              <span
                aria-hidden="true"
                className="relative w-[14px] h-[14px] rounded-full border-2 border-aubergine/30 border-t-aubergine animate-spin"
              />
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="relative w-[18px] h-[18px]"
                aria-hidden="true"
              >
                <rect x="9" y="3" width="6" height="11" rx="3" />
                <path d="M5 11a7 7 0 0 0 14 0" />
                <path d="M12 18v3" />
              </svg>
            )}
          </button>
        )}
        <button
          type="submit"
          disabled={disabled || !value.trim()}
          aria-label="Send"
          className="shrink-0 self-end pb-[2px] display italic text-[15px] sm:text-[16px] text-aubergine hover:text-violetInk transition-colors disabled:text-margin/50 disabled:cursor-not-allowed"
        >
          send&nbsp;→
        </button>
      </form>
      {micError && (
        <p
          role="alert"
          className="eyebrow text-red-700/80 text-[11px] tracking-[0.18em]"
        >
          {micError}
        </p>
      )}
    </div>
  );
}
