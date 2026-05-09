import type { Context } from "hono";
import { stream } from "hono/streaming";
import { AzureOpenAI } from "openai";
import { VESPERS_SYSTEM_PROMPT } from "../lib/prompt.js";
import {
  appendMessages,
  buildContextHint,
  createSession,
  getSession,
  type Message,
} from "../lib/memory.js";
import {
  generateRecoveryCode,
  isRecoveryCode,
  normalizeCode,
} from "../lib/recovery-code.js";

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

  const session = (await getSession(code))!;
  const contextHint = buildContextHint(session);

  const client = new AzureOpenAI({
    apiKey,
    endpoint,
    deployment,
    apiVersion,
  });

  const systemContent = contextHint
    ? `${VESPERS_SYSTEM_PROMPT}\n\n${contextHint}`
    : VESPERS_SYSTEM_PROMPT;

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
      await appendMessages(code!, turn);
    }
  });
}
