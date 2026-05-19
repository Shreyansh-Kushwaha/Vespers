import type { Context } from "hono";
import { stream } from "hono/streaming";
import { AzureOpenAI } from "openai";
import {
  buildCrisisDirective,
  buildMemoryContext,
  buildOpeningDirective,
  buildPersonaSwitchOpener,
  composeSystemPrompt,
} from "../lib/prompt.js";
import {
  composeGappuSystemPrompt,
  GAPPU_CRISIS_HANDOFF_DIRECTIVE,
} from "../lib/prompt-gappu.js";
import {
  appendMessages,
  createSession,
  getSession,
  type Message,
  type Persona,
} from "../lib/memory.js";
import {
  generateRecoveryCode,
  isRecoveryCode,
  normalizeCode,
} from "../lib/recovery-code.js";
import { classifyRisk } from "../lib/risk.js";
import { summariseAndCompact, shouldSummarise } from "../lib/memory-summary.js";

interface ChatBody {
  message?: string;
  code?: string | null;
  persona?: Persona;
  /** When true, the AI speaks first — no user message is recorded. Fires on a
   *  manual persona switch so the new persona greets in their own voice. */
  opener?: boolean;
}

function isPersona(p: unknown): p is Persona {
  return p === "vespers" || p === "gappu";
}

export async function chatHandler(c: Context) {
  let body: ChatBody;
  try {
    body = (await c.req.json()) as ChatBody;
  } catch {
    return c.text("Invalid JSON", 400);
  }

  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT;
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION || "2024-12-01-preview";

  if (!apiKey || !endpoint || !deployment) {
    return c.text(
      "Vespers is not configured yet. Set AZURE_OPENAI_API_KEY, AZURE_OPENAI_ENDPOINT, and AZURE_OPENAI_DEPLOYMENT in .env and restart the server.",
      503,
    );
  }

  const userText = (body.message || "").trim();
  const isOpener = body.opener === true;
  if (!isOpener && !userText) return c.text("Empty message", 400);

  // Default persona is "vespers" — keeps legacy clients (no persona field)
  // behaving exactly as before.
  const requestedPersona: Persona = isPersona(body.persona) ? body.persona : "vespers";

  let code = body.code ? normalizeCode(body.code) : null;
  let isNewSession = false;
  if (!code || !isRecoveryCode(code)) {
    code = generateRecoveryCode();
    await createSession(code);
    isNewSession = true;
  } else {
    const existing = await getSession(code);
    if (!existing) {
      await createSession(code);
      isNewSession = true;
    }
  }

  const session = await getSession(code);
  if (!session) {
    return c.text(
      "Could not load session. If you just configured Supabase, run backend/supabase/migrations/*.sql in the SQL Editor.",
      503,
    );
  }

  // Risk classification on the *current* user message — heuristic, in-process,
  // never persisted, never logged externally. Opener turns have no user
  // message to classify, so they always start at the "none" baseline.
  const risk = isOpener
    ? { level: "low" as const, category: undefined, showSupportBanner: false }
    : classifyRisk(userText);

  // Crisis override: if the user picked Gappu but the message looks distressed,
  // step Vespers in for this single turn. The Gappu persona resumes next turn.
  const effectivePersona: Persona =
    requestedPersona === "gappu" && risk.showSupportBanner ? "vespers" : requestedPersona;
  const crisisHandoff = requestedPersona === "gappu" && effectivePersona === "vespers";

  const memoryContext = buildMemoryContext(session.memory);
  const openingDirective = buildOpeningDirective(session, Date.now());
  const crisisDirective = buildCrisisDirective(risk);

  // Opener directive — only fires when the AI is speaking first (persona switch).
  const openerDirective = isOpener
    ? buildPersonaSwitchOpener(effectivePersona, session.messages.length > 0)
    : "";

  const composedCrisisDirective = [
    crisisHandoff
      ? [crisisDirective, GAPPU_CRISIS_HANDOFF_DIRECTIVE].filter(Boolean).join("\n\n")
      : crisisDirective,
    openerDirective,
  ]
    .filter(Boolean)
    .join("\n\n");

  const systemContent =
    effectivePersona === "gappu"
      ? composeGappuSystemPrompt({
          memoryContext,
          openingDirective,
          crisisDirective: [crisisDirective, openerDirective]
            .filter(Boolean)
            .join("\n\n"),
        })
      : composeSystemPrompt({
          memoryContext,
          openingDirective,
          crisisDirective: composedCrisisDirective,
        });

  const client = new AzureOpenAI({ apiKey, endpoint, deployment, apiVersion });

  const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
    { role: "system", content: systemContent },
    ...session.messages.map((m) => ({
      role: (m.role === "model" ? "assistant" : "user") as "user" | "assistant",
      content: m.content,
    })),
  ];
  if (!isOpener) {
    messages.push({ role: "user", content: userText });
  }

  c.header("Content-Type", "text/plain; charset=utf-8");
  c.header("Cache-Control", "no-cache, no-transform");
  c.header("X-Accel-Buffering", "no");
  c.header("X-Vespers-Code", code);
  c.header("X-Vespers-New-Session", isNewSession ? "1" : "0");
  // Persona that actually answered this turn. The frontend uses this to style
  // the bubble and to know when a crisis override flipped the persona back.
  c.header("X-Vespers-Persona", effectivePersona);
  c.header("X-Vespers-Persona-Requested", requestedPersona);
  // Risk header is purely advisory for the UI banner. Never includes raw text.
  c.header("X-Vespers-Risk-Level", risk.level);
  if (risk.category) c.header("X-Vespers-Risk-Category", risk.category);
  c.header("X-Vespers-Show-Support", risk.showSupportBanner ? "1" : "0");

  // Gappu runs hotter so jokes don't all sound the same; Vespers stays steady.
  const temperature = effectivePersona === "gappu" ? 0.95 : 0.85;

  return stream(c, async (s) => {
    let full = "";
    try {
      const completion = await client.chat.completions.create({
        model: deployment,
        messages,
        stream: true,
        temperature,
        top_p: 0.95,
        max_completion_tokens: 700,
      });

      for await (const chunk of completion) {
        const text = chunk.choices?.[0]?.delta?.content ?? "";
        if (text) {
          full += text;
          await s.write(text);
        }
      }
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Something went quiet on our side.";
      await s.write(`\n\n[Vespers had trouble responding: ${msg}]`);
    } finally {
      const now = Date.now();
      // Both halves of the turn live in the user's CURRENT thread (the persona
      // they were chatting with). When a crisis override flipped Gappu →
      // Vespers, record replyPersona so the assistant bubble still styles as
      // the stand-in even though the message belongs to the Gappu thread.
      const turn: Message[] = isOpener
        ? [
            {
              role: "model",
              content: full,
              ts: now,
              persona: requestedPersona,
              ...(effectivePersona !== requestedPersona
                ? { replyPersona: effectivePersona }
                : {}),
            },
          ]
        : [
            { role: "user", content: userText, ts: now, persona: requestedPersona },
            {
              role: "model",
              content: full,
              ts: now + 1,
              persona: requestedPersona,
              ...(effectivePersona !== requestedPersona
                ? { replyPersona: effectivePersona }
                : {}),
            },
          ];
      const updated = await appendMessages(code!, turn);

      // Fire-and-forget: fold older history into structured memory if needed.
      // Runs after the stream closes so it never blocks the user.
      if (updated && shouldSummarise(updated)) {
        summariseAndCompact(updated).catch((e) => {
          console.warn("[chat] summarise failed:", e?.message ?? e);
        });
      }
    }
  });
}
