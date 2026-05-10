import { apiUrl } from "./api";

export type LetterMode =
  | "grief"
  | "burnout"
  | "anxiety"
  | "shame"
  | "encouragement"
  | "forgiveness"
  | "custom";

export interface Letter {
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

export const MODE_LABEL: Record<LetterMode, string> = {
  grief: "a letter on grief",
  burnout: "a letter to a tired self",
  anxiety: "a letter through the noise",
  shame: "a letter past the shame",
  encouragement: "a letter of encouragement",
  forgiveness: "a letter of forgiveness",
  custom: "a letter to yourself",
};

export const MODE_OPENING: Record<LetterMode, string> = {
  grief: "what are you grieving — and what part of you is the one grieving?",
  burnout: "what have you been carrying that wasn't yours to carry?",
  anxiety: "what does the worry sound like, in your own words?",
  shame: "what would you tell a friend in the place you are right now?",
  encouragement: "what do you wish someone would say to you tonight?",
  forgiveness: "who is the version of you you are trying to release?",
  custom: "where would you like to begin?",
};

export async function listLetters(code: string): Promise<Letter[]> {
  const res = await fetch(apiUrl(`/api/letters?code=${encodeURIComponent(code)}`));
  if (!res.ok) return [];
  const data = (await res.json()) as { ok: boolean; letters?: Letter[] };
  return data.letters ?? [];
}

export async function createLetter(
  code: string,
  mode: LetterMode,
  customMode?: string,
): Promise<Letter | null> {
  const res = await fetch(apiUrl(`/api/letters?code=${encodeURIComponent(code)}`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode, customMode }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { ok: boolean; letter?: Letter };
  return data.letter ?? null;
}

export async function getLetter(code: string, id: string): Promise<Letter | null> {
  const res = await fetch(
    apiUrl(`/api/letters/${encodeURIComponent(id)}?code=${encodeURIComponent(code)}`),
  );
  if (!res.ok) return null;
  const data = (await res.json()) as { ok: boolean; letter?: Letter };
  return data.letter ?? null;
}

export async function updateLetter(
  code: string,
  id: string,
  patch: Partial<Pick<Letter, "content" | "title" | "status" | "custom_mode">>,
): Promise<Letter | null> {
  const body: Record<string, unknown> = {};
  if (patch.content !== undefined) body.content = patch.content;
  if (patch.title !== undefined) body.title = patch.title;
  if (patch.status !== undefined) body.status = patch.status;
  if (patch.custom_mode !== undefined) body.customMode = patch.custom_mode;
  const res = await fetch(
    apiUrl(`/api/letters/${encodeURIComponent(id)}?code=${encodeURIComponent(code)}`),
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  if (!res.ok) return null;
  const data = (await res.json()) as { ok: boolean; letter?: Letter };
  return data.letter ?? null;
}

export async function deleteLetter(code: string, id: string): Promise<boolean> {
  const res = await fetch(
    apiUrl(`/api/letters/${encodeURIComponent(id)}?code=${encodeURIComponent(code)}`),
    { method: "DELETE" },
  );
  if (!res.ok) return false;
  const data = (await res.json()) as { ok: boolean; deleted?: boolean };
  return data.deleted ?? false;
}

export async function whisperOnLetter(code: string, id: string): Promise<string> {
  const res = await fetch(
    apiUrl(`/api/letters/${encodeURIComponent(id)}/whisper?code=${encodeURIComponent(code)}`),
    { method: "POST" },
  );
  if (!res.ok) return "";
  const data = (await res.json()) as { ok: boolean; whisper?: string };
  return data.whisper ?? "";
}
