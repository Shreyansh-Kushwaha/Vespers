import type { Context } from "hono";
import { AzureOpenAI } from "openai";
import { getSupabase, LETTERS_TABLE } from "../lib/supabase.js";
import { isRecoveryCode, normalizeCode } from "../lib/recovery-code.js";

export type LetterMode =
  | "grief"
  | "burnout"
  | "anxiety"
  | "shame"
  | "encouragement"
  | "forgiveness"
  | "custom";

const VALID_MODES: LetterMode[] = [
  "grief",
  "burnout",
  "anxiety",
  "shame",
  "encouragement",
  "forgiveness",
  "custom",
];

export interface LetterRow {
  id: string;
  code: string;
  mode: LetterMode;
  custom_mode: string | null;
  title: string | null;
  content: string;
  status: "draft" | "saved";
  created_at: number;
  updated_at: number;
}

function requireCode(c: Context): string | null {
  const code = c.req.query("code");
  if (!code || !isRecoveryCode(code)) return null;
  return normalizeCode(code);
}

const SELECT = "id, code, mode, custom_mode, title, content, status, created_at, updated_at";

// ── List ──────────────────────────────────────────────────────────────────
export async function listLettersHandler(c: Context) {
  const code = requireCode(c);
  if (!code) return c.json({ ok: false, error: "invalid_code" }, 400);
  const sb = getSupabase();
  const { data, error } = await sb
    .from(LETTERS_TABLE)
    .select(SELECT)
    .eq("code", code)
    .order("updated_at", { ascending: false });
  if (error) return c.json({ ok: false, error: error.message }, 500);
  return c.json({ ok: true, letters: data ?? [] });
}

// ── Create ────────────────────────────────────────────────────────────────
export async function createLetterHandler(c: Context) {
  const code = requireCode(c);
  if (!code) return c.json({ ok: false, error: "invalid_code" }, 400);

  let body: {
    mode?: string;
    customMode?: string;
    title?: string;
    content?: string;
  };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ ok: false, error: "invalid_json" }, 400);
  }

  const mode = (body.mode ?? "custom") as LetterMode;
  if (!VALID_MODES.includes(mode)) {
    return c.json({ ok: false, error: "invalid_mode" }, 400);
  }
  const now = Date.now();
  const sb = getSupabase();
  const { data, error } = await sb
    .from(LETTERS_TABLE)
    .insert({
      code,
      mode,
      custom_mode: mode === "custom" ? (body.customMode ?? "").slice(0, 60) : null,
      title: (body.title ?? "").slice(0, 120) || null,
      content: (body.content ?? "").slice(0, 50_000),
      status: "draft",
      created_at: now,
      updated_at: now,
    })
    .select(SELECT)
    .single();
  if (error) return c.json({ ok: false, error: error.message }, 500);
  return c.json({ ok: true, letter: data });
}

// ── Get one ───────────────────────────────────────────────────────────────
export async function getLetterHandler(c: Context) {
  const code = requireCode(c);
  if (!code) return c.json({ ok: false, error: "invalid_code" }, 400);
  const id = c.req.param("id");
  const sb = getSupabase();
  const { data, error } = await sb
    .from(LETTERS_TABLE)
    .select(SELECT)
    .eq("id", id)
    .eq("code", code)
    .maybeSingle();
  if (error) return c.json({ ok: false, error: error.message }, 500);
  if (!data) return c.json({ ok: false, error: "not_found" }, 404);
  return c.json({ ok: true, letter: data });
}

// ── Update (autosave) ─────────────────────────────────────────────────────
export async function updateLetterHandler(c: Context) {
  const code = requireCode(c);
  if (!code) return c.json({ ok: false, error: "invalid_code" }, 400);
  const id = c.req.param("id");

  let body: {
    content?: string;
    title?: string;
    status?: "draft" | "saved";
    customMode?: string;
  };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ ok: false, error: "invalid_json" }, 400);
  }

  const patch: Record<string, unknown> = { updated_at: Date.now() };
  if (typeof body.content === "string") patch.content = body.content.slice(0, 50_000);
  if (typeof body.title === "string") patch.title = body.title.slice(0, 120) || null;
  if (body.status === "draft" || body.status === "saved") patch.status = body.status;
  if (typeof body.customMode === "string") patch.custom_mode = body.customMode.slice(0, 60);

  const sb = getSupabase();
  const { data, error } = await sb
    .from(LETTERS_TABLE)
    .update(patch)
    .eq("id", id)
    .eq("code", code)
    .select(SELECT)
    .maybeSingle();
  if (error) return c.json({ ok: false, error: error.message }, 500);
  if (!data) return c.json({ ok: false, error: "not_found" }, 404);
  return c.json({ ok: true, letter: data });
}

// ── Delete ────────────────────────────────────────────────────────────────
export async function deleteLetterHandler(c: Context) {
  const code = requireCode(c);
  if (!code) return c.json({ ok: false, error: "invalid_code" }, 400);
  const id = c.req.param("id");
  const sb = getSupabase();
  const { error, count } = await sb
    .from(LETTERS_TABLE)
    .delete({ count: "exact" })
    .eq("id", id)
    .eq("code", code);
  if (error) return c.json({ ok: false, error: error.message }, 500);
  return c.json({ ok: true, deleted: (count ?? 0) > 0 });
}

// ── Whisper (gentle prompt for the writer) ────────────────────────────────
const WHISPER_PROMPT = `You are Vespers, helping a person write a private letter to themselves.

You are NOT writing the letter. You offer at most one or two short, quiet prompts to help the writer find what they want to say next — never put words in their mouth, never insert clichés.

The user has chosen a mode: {{MODE}}. Your job is to gently ask one question or surface one gentle reframe that opens space — not to advise, not to comfort prematurely, not to list options.

VOICE
- lowercase, plain, restrained
- no therapy clichés ("be kind to yourself", "you are enough")
- no emojis, no exclamation marks
- 1–3 short sentences total
- prefer questions over statements when the writer seems stuck
- if the writer is being self-critical, offer one gentle reframe in their own register

NEVER
- diagnose
- claim to know what they need
- write a paragraph for them to copy
- moralise

Read what they have written so far. Offer one quiet prompt.`;

export async function whisperLetterHandler(c: Context) {
  const code = requireCode(c);
  if (!code) return c.json({ ok: false, error: "invalid_code" }, 400);
  const id = c.req.param("id");

  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT;
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION || "2024-12-01-preview";
  if (!apiKey || !endpoint || !deployment) {
    return c.json({ ok: false, error: "azure_not_configured" }, 503);
  }

  const sb = getSupabase();
  const { data: letter, error } = await sb
    .from(LETTERS_TABLE)
    .select(SELECT)
    .eq("id", id)
    .eq("code", code)
    .maybeSingle();
  if (error) return c.json({ ok: false, error: error.message }, 500);
  if (!letter) return c.json({ ok: false, error: "not_found" }, 404);

  const mode =
    letter.mode === "custom" && letter.custom_mode
      ? letter.custom_mode
      : letter.mode;
  const content = (letter.content ?? "").slice(-4000);

  const client = new AzureOpenAI({ apiKey, endpoint, deployment, apiVersion });
  const completion = await client.chat.completions.create({
    model: deployment,
    messages: [
      { role: "system", content: WHISPER_PROMPT.replace("{{MODE}}", mode) },
      {
        role: "user",
        content: content
          ? `Letter so far:\n\n${content}\n\nOffer one quiet prompt.`
          : `The writer has not started yet. Offer a single quiet opening prompt for the mode "${mode}".`,
      },
    ],
    temperature: 0.75,
    max_completion_tokens: 140,
  });
  const text = (completion.choices?.[0]?.message?.content ?? "").trim();
  return c.json({ ok: true, whisper: text });
}
