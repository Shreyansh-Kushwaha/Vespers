import type { Context } from "hono";
import { stream } from "hono/streaming";
import { AzureOpenAI } from "openai";
import {
  buildCrisisDirective,
  buildMemoryContext,
  buildOpeningDirective,
  composeSystemPrompt,
} from "../lib/prompt.js";
import {
  appendMessages,
  createSession,
  getSession,
  type Message,
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
  if (!userText) return c.text("Empty message", 400);

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
  // never persisted, never logged externally.
  const risk = classifyRisk(userText);

  const systemContent = composeSystemPrompt({
    memoryContext: buildMemoryContext(session.memory),
    openingDirective: buildOpeningDirective(session, Date.now()),
    crisisDirective: buildCrisisDirective(risk),
  });

  const client = new AzureOpenAI({ apiKey, endpoint, deployment, apiVersion });

  const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
    { role: "system", content: systemContent },
    ...session.messages.map((m) => ({
      role: (m.role === "model" ? "assistant" : "user") as "user" | "assistant",
      content: m.content,
    })),
    { role: "user", content: userText },
  ];

  c.header("Content-Type", "text/plain; charset=utf-8");
  c.header("Cache-Control", "no-cache, no-transform");
  c.header("X-Accel-Buffering", "no");
  c.header("X-Vespers-Code", code);
  c.header("X-Vespers-New-Session", isNewSession ? "1" : "0");
  // Risk header is purely advisory for the UI banner. Never includes raw text.
  c.header("X-Vespers-Risk-Level", risk.level);
  if (risk.category) c.header("X-Vespers-Risk-Category", risk.category);
  c.header("X-Vespers-Show-Support", risk.showSupportBanner ? "1" : "0");

  return stream(c, async (s) => {
    let full = "";
    try {
      const completion = await client.chat.completions.create({
        model: deployment,
        messages,
        stream: true,
        temperature: 0.85,
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
      const turn: Message[] = [
        { role: "user", content: userText, ts: now },
        { role: "model", content: full, ts: now + 1 },
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
