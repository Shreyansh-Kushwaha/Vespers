"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { PaperSurface } from "@/components/marketing/PaperSurface";
import {
  deleteLetter,
  getLetter,
  MODE_LABEL,
  MODE_OPENING,
  updateLetter,
  whisperOnLetter,
  type Letter,
} from "@/lib/letters";

const CODE_KEY = "vespers.code";
const AUTOSAVE_DEBOUNCE = 1200;

function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function LetterEditorPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [code, setCode] = useState<string | null>(null);
  const [letter, setLetter] = useState<Letter | null>(null);
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [whisper, setWhisper] = useState<string>("");
  const [whispering, setWhispering] = useState(false);
  const [loading, setLoading] = useState(true);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirtyRef = useRef(false);

  // Load
  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem(CODE_KEY) : null;
    if (!saved) {
      setLoading(false);
      return;
    }
    setCode(saved);
    getLetter(saved, id)
      .then((l) => {
        if (l) {
          setLetter(l);
          setContent(l.content);
          setTitle(l.title ?? "");
          setSavedAt(l.updated_at);
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  // Autosave
  const scheduleSave = useCallback(
    (next: { content?: string; title?: string }) => {
      if (!code || !letter) return;
      dirtyRef.current = true;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        const updated = await updateLetter(code, letter.id, next);
        if (updated) {
          setSavedAt(updated.updated_at);
          dirtyRef.current = false;
        }
      }, AUTOSAVE_DEBOUNCE);
    },
    [code, letter],
  );

  const onContentChange = (v: string) => {
    setContent(v);
    scheduleSave({ content: v });
  };

  const onTitleChange = (v: string) => {
    setTitle(v);
    scheduleSave({ title: v });
  };

  // Save on unload
  useEffect(() => {
    const onBeforeUnload = () => {
      if (dirtyRef.current && code && letter) {
        navigator.sendBeacon?.(
          `/api/letters/${letter.id}?code=${encodeURIComponent(code)}`,
          new Blob(
            [JSON.stringify({ content, title })],
            { type: "application/json" },
          ),
        );
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [code, letter, content, title]);

  const askForWhisper = async () => {
    if (!code || !letter || whispering) return;
    setWhispering(true);
    setWhisper("");
    try {
      const text = await whisperOnLetter(code, letter.id);
      setWhisper(text);
    } finally {
      setWhispering(false);
    }
  };

  const onDelete = async () => {
    if (!code || !letter) return;
    const confirmed = window.confirm(
      "Delete this letter?\n\nThis can't be undone.",
    );
    if (!confirmed) return;
    const ok = await deleteLetter(code, letter.id);
    if (ok) router.push("/letters");
  };

  const subjectLabel = useMemo(() => {
    if (!letter) return "";
    return letter.mode === "custom" && letter.custom_mode
      ? letter.custom_mode
      : MODE_LABEL[letter.mode];
  }, [letter]);

  const opening = useMemo(() => {
    if (!letter) return "";
    return letter.mode === "custom"
      ? "where would you like to begin?"
      : MODE_OPENING[letter.mode];
  }, [letter]);

  return (
    <main className="relative min-h-dvh flex flex-col bg-paper text-ink">
      <PaperSurface />

      <header className="hairline-b sticky top-0 z-10 bg-paper/95 backdrop-blur-[2px]">
        <div className="mx-auto max-w-[1240px] w-full px-6 sm:px-10 lg:px-16 py-4 sm:py-5 flex items-baseline gap-6">
          <Link
            href="/app"
            className="script text-[28px] sm:text-[34px] leading-none text-aubergine hover:text-violetInk transition-colors"
          >
            Vespers
          </Link>
          <span className="eyebrow hidden sm:inline">{subjectLabel}</span>
          <span className="flex-1" />
          {savedAt && (
            <span className="eyebrow text-margin">
              saved {formatTimestamp(savedAt)}
            </span>
          )}
          <Link href="/letters" className="eyebrow text-margin hover:text-aubergine transition-colors">
            ← drawer
          </Link>
        </div>
      </header>

      <section className="flex-1 px-6 sm:px-12 lg:px-20 py-12 sm:py-20">
        <div className="mx-auto w-full max-w-[700px]">
          {loading ? (
            <p className="eyebrow text-margin">opening the page…</p>
          ) : !code ? (
            <p className="text-margin text-[15px] leading-[1.75]">
              no recovery code on this device. open this letter on the device
              that holds your code.
            </p>
          ) : !letter ? (
            <p className="text-margin text-[15px] leading-[1.75]">
              this letter could not be found.{" "}
              <Link href="/letters" className="ink-link">return to drawer</Link>.
            </p>
          ) : (
            <>
              <div className="eyebrow mb-5">{subjectLabel}</div>
              <input
                value={title}
                onChange={(e) => onTitleChange(e.target.value)}
                placeholder="give it a title (optional)"
                maxLength={120}
                className="w-full bg-transparent outline-none display text-[clamp(28px,4vw,42px)] leading-[1.1] tracking-[-0.01em] text-ink placeholder:text-margin/50 mb-3"
              />
              <p className="display italic text-[15px] sm:text-[16px] leading-[1.7] text-margin mb-10">
                {opening}
              </p>

              <textarea
                value={content}
                onChange={(e) => onContentChange(e.target.value)}
                placeholder=""
                rows={20}
                className="w-full resize-y min-h-[60vh] bg-transparent outline-none display text-[17.5px] sm:text-[18px] leading-[1.85] text-ink placeholder:text-margin/60"
                autoFocus
              />

              <div className="mt-8 hairline pt-5 flex items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={askForWhisper}
                  disabled={whispering}
                  className="eyebrow text-margin hover:text-aubergine transition-colors disabled:opacity-60"
                >
                  {whispering ? "listening…" : "ask vespers for a quiet prompt"}
                </button>
                <div className="flex items-center gap-6">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="eyebrow text-margin hover:text-aubergine transition-colors"
                  >
                    print / save pdf
                  </button>
                  <button
                    type="button"
                    onClick={onDelete}
                    className="eyebrow text-margin hover:text-aubergine transition-colors"
                  >
                    delete
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {whisper && (
                  <motion.aside
                    key="whisper"
                    initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    className="mt-7 bg-paperDeep/60 border border-rule px-5 py-4"
                  >
                    <div className="eyebrow mb-2 text-aubergine/90">vespers, quietly</div>
                    <p className="display italic text-[15px] leading-[1.7] text-ink/85">
                      {whisper}
                    </p>
                  </motion.aside>
                )}
              </AnimatePresence>
            </>
          )}
        </div>
      </section>

      {/* Print stylesheet — keep the letter clean on paper */}
      <style jsx global>{`
        @media print {
          header, button, aside, .eyebrow, footer, nav { display: none !important; }
          main { background: #fff !important; }
          textarea { border: 0 !important; outline: 0 !important; }
        }
      `}</style>
    </main>
  );
}
