/**
 * Frontend types & helpers for the emotion wheel. The canonical catalog lives
 * on the backend at GET /api/emotions; the browser fetches it lazily.
 *
 * EmotionSelection is what gets sent back on chat turns (just the keys, never
 * the full record — the backend re-resolves).
 */

export type PrimaryKey =
  | "sad"
  | "happy"
  | "angry"
  | "fearful"
  | "surprised"
  | "disgusted"
  | "overwhelmed";

export interface Tertiary {
  key: string;
  label: string;
  definition: string;
  tone: string;
  activity?: { name: string; description: string };
  meditation?: { name: string; description: string };
  exercise?: string;
  quietObject?: "koi" | "wash" | "candle" | "breathe";
}

export interface Secondary {
  key: string;
  label: string;
  definition: string;
  tertiaries: Tertiary[];
}

export interface Primary {
  key: PrimaryKey;
  label: string;
  emoji: string;
  definition: string;
  tone: string;
  secondaries: Secondary[];
}

export interface EmotionSelection {
  primary: PrimaryKey;
  secondary?: string;
  tertiary?: string;
}

const STORAGE_KEY_PREFIX = "vespers.emotion.";
const STORAGE_KEY_SESSION = "vespers.emotion.session";

function storageKey(code: string | null): string {
  return code ? STORAGE_KEY_PREFIX + code : STORAGE_KEY_SESSION;
}

export function readEmotion(code: string | null): EmotionSelection | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(storageKey(code));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as EmotionSelection;
    return parsed?.primary ? parsed : null;
  } catch {
    return null;
  }
}

export function writeEmotion(code: string | null, sel: EmotionSelection | null): void {
  if (typeof localStorage === "undefined") return;
  try {
    if (!sel) localStorage.removeItem(storageKey(code));
    else localStorage.setItem(storageKey(code), JSON.stringify(sel));
  } catch {
    /* storage unavailable */
  }
}

/** Pretty path for chips: "Sad → Vulnerable → Victimised". */
export function emotionPath(
  primaries: Primary[],
  sel: EmotionSelection | null,
): string {
  if (!sel) return "";
  const p = primaries.find((x) => x.key === sel.primary);
  if (!p) return "";
  const s = sel.secondary ? p.secondaries.find((x) => x.key === sel.secondary) : undefined;
  const t = s && sel.tertiary ? s.tertiaries.find((x) => x.key === sel.tertiary) : undefined;
  return [p.label, s?.label, t?.label].filter(Boolean).join(" → ");
}

let cachedCatalog: Promise<Primary[]> | null = null;
export function fetchEmotionCatalog(): Promise<Primary[]> {
  if (!cachedCatalog) {
    cachedCatalog = fetch("/api/emotions")
      .then((r) => r.json())
      .then((j: { primaries: Primary[] }) => j.primaries)
      .catch(() => []);
  }
  return cachedCatalog;
}
