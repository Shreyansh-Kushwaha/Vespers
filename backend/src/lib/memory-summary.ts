import { AzureOpenAI } from "openai";
import {
  EMPTY_MEMORY,
  replaceMemoryAndMessages,
  type Message,
  type Session,
  type SessionMemory,
} from "./memory.js";

// Trigger summarisation when message count crosses this; keep newest TAIL
// turns verbatim and roll the older ones into structured memory.
const SUMMARY_TRIGGER = 50;
const KEEP_TAIL = 20;

const SUMMARISER_PROMPT = `You are an emotional-continuity summariser working for an anonymous wellness assistant.

Your only job: read a transcript of older messages and produce a short, structured emotional summary that lets a future assistant carry continuity with the same person — without storing identifying or sensitive details.

OUTPUT
Return strictly valid JSON matching this exact shape, with all keys present (use empty arrays / empty string when nothing fits):

{
  "emotionalThemes": string[],
  "recurringConcerns": string[],
  "copingStrategies": string[],
  "personalWins": string[],
  "unresolvedTopics": string[],
  "relationshipPatterns": string[],
  "summary": string
}

WHAT TO CAPTURE
- emotionalThemes: durable feeling-states ("fear of disappointing others", "anticipatory grief").
- recurringConcerns: situations or topics returned to repeatedly.
- copingStrategies: things the user tried that seemed to help.
- personalWins: small, real moments worth remembering (named gently, not sycophantically).
- unresolvedTopics: things they were still sitting with.
- relationshipPatterns: durable relational dynamics, no names ("a controlling parent", "a partner who feels distant"). Use roles, never names.
- summary: 2–4 short sentences in plain prose. Calm, observational. No therapy clichés.

NEVER STORE
- real names, addresses, phone numbers, emails, government IDs
- passwords, financial data
- explicit self-harm methods or plans (the *fact* that distress was present can be noted as an emotional theme; never the means)
- traumatic content beyond what the assistant needs for continuity — describe shape, not detail
- diagnostic labels ("they have BPD"); describe patterns instead

VOICE
Lowercase, plain, restrained. No diagnoses. No advice. No interpretation beyond what is observable in the transcript. If something is ambiguous, leave it out.

If the transcript is too thin to summarise meaningfully, return the empty shape with all arrays empty and summary as an empty string.`;

interface ParsedMemory extends Partial<SessionMemory> {}

function mergeArrays(prev: string[], next: string[] | undefined): string[] {
  const all = [...prev, ...(next ?? [])]
    .map((s) => (typeof s === "string" ? s.trim() : ""))
    .filter(Boolean);
  // De-duplicate case-insensitively while preserving casing of first occurrence.
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of all) {
    const k = item.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(item);
  }
  // Cap each list so memory doesn't sprawl.
  return out.slice(0, 16);
}

function mergeMemory(prev: SessionMemory, next: ParsedMemory): SessionMemory {
  return {
    emotionalThemes: mergeArrays(prev.emotionalThemes, next.emotionalThemes),
    recurringConcerns: mergeArrays(prev.recurringConcerns, next.recurringConcerns),
    copingStrategies: mergeArrays(prev.copingStrategies, next.copingStrategies),
    personalWins: mergeArrays(prev.personalWins, next.personalWins),
    unresolvedTopics: mergeArrays(prev.unresolvedTopics, next.unresolvedTopics),
    relationshipPatterns: mergeArrays(
      prev.relationshipPatterns,
      next.relationshipPatterns,
    ),
    // Replace prose summary with the latest one (it already incorporates the
    // user's prior summary if we pass it in below). Cap length defensively.
    summary: (next.summary ?? prev.summary ?? "").trim().slice(0, 1200),
  };
}

function transcriptFromMessages(msgs: Message[]): string {
  return msgs
    .map((m) => `[${m.role === "user" ? "USER" : "VESPERS"}] ${m.content}`)
    .join("\n\n");
}

/**
 * Returns true when this session is over the threshold and should fold its
 * older turns into structured memory.
 */
export function shouldSummarise(session: Session): boolean {
  return session.messages.length >= SUMMARY_TRIGGER;
}

/**
 * Take the older portion of the session, summarise it via Azure OpenAI's
 * structured JSON output, merge into existing memory, and replace messages
 * with just the newest tail. Best-effort: errors are logged, not thrown.
 */
export async function summariseAndCompact(session: Session): Promise<void> {
  if (!shouldSummarise(session)) return;

  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT;
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION || "2024-12-01-preview";
  if (!apiKey || !endpoint || !deployment) {
    console.warn("[memory-summary] azure not configured; skipping");
    return;
  }

  const tail = session.messages.slice(-KEEP_TAIL);
  const older = session.messages.slice(0, session.messages.length - KEEP_TAIL);
  if (!older.length) return;

  const transcript = transcriptFromMessages(older);
  const priorMemoryJson = JSON.stringify(session.memory ?? EMPTY_MEMORY);

  const client = new AzureOpenAI({ apiKey, endpoint, deployment, apiVersion });

  let parsed: ParsedMemory;
  try {
    const completion = await client.chat.completions.create({
      model: deployment,
      messages: [
        { role: "system", content: SUMMARISER_PROMPT },
        {
          role: "user",
          content: `PRIOR_STRUCTURED_MEMORY:\n${priorMemoryJson}\n\nOLDER_TRANSCRIPT:\n${transcript}\n\nReturn the updated structured memory as JSON.`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.4,
      max_completion_tokens: 700,
    });
    const raw = completion.choices?.[0]?.message?.content ?? "{}";
    parsed = JSON.parse(raw) as ParsedMemory;
  } catch (err) {
    console.warn(
      "[memory-summary] failed:",
      err instanceof Error ? err.message : err,
    );
    return;
  }

  const merged = mergeMemory(session.memory, parsed);
  await replaceMemoryAndMessages(session.code, merged, tail);
}
