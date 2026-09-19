import { GoogleGenAI } from "@google/genai";

let _client: GoogleGenAI | null = null;

/** Returns the shared Gemini client, initialising it on first call. */
export function getGemini(): GoogleGenAI {
  if (!_client) {
    _client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
  }
  return _client;
}

export function getGeminiModel(): string {
  return process.env.GEMINI_MODEL || "gemini-3.6-flash";
}

/** Cheaper/faster model for background summarisation. Defaults to the main
 *  chat model so existing setups work without extra config. Override with
 *  GEMINI_SUMMARISE_MODEL to route summarisation elsewhere. */
export function getSummariseModel(): string {
  return process.env.GEMINI_SUMMARISE_MODEL || getGeminiModel();
}

export interface ChatTurn {
  role: "user" | "model";
  content: string;
}

/**
 * Converts an OpenAI-style [{role, content}] turn list into Gemini's
 * `contents` shape. Gemini requires the list to start with a "user" turn,
 * end on a "user" turn, and doesn't tolerate empty history — unlike an
 * OpenAI completion, which is happy with a system-only prompt or a trailing
 * assistant turn. This merges consecutive same-role turns and pads a
 * placeholder "user" turn on either end when needed, which happens on the
 * opener flow: the AI speaks first (no new user text this turn), and if that
 * also follows another opener (persona switch with no session history yet),
 * the raw turn list can start and/or end on "model".
 */
export function toGeminiContents(
  turns: ChatTurn[],
): { role: "user" | "model"; parts: { text: string }[] }[] {
  const merged: ChatTurn[] = [];
  for (const t of turns) {
    if (!t.content) continue;
    const last = merged[merged.length - 1];
    if (last && last.role === t.role) {
      last.content += `\n\n${t.content}`;
    } else {
      merged.push({ ...t });
    }
  }
  if (merged.length === 0 || merged[0].role !== "user") {
    merged.unshift({ role: "user", content: "(conversation begins)" });
  }
  if (merged[merged.length - 1].role !== "user") {
    merged.push({ role: "user", content: "(continue)" });
  }
  return merged.map((t) => ({ role: t.role, parts: [{ text: t.content }] }));
}
