import type { Context } from "hono";
import { stream } from "hono/streaming";
import { GoogleGenerativeAI } from "@google/generative-ai";
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

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return c.text(
      "Vespers is not configured yet. Add GEMINI_API_KEY to .env and restart the server.",
      503,
    );
  }

  const userText = (body.message || "").trim();
  if (!userText) return c.text("Empty message", 400);

  // Resolve or create the session linked to a recovery code.
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

  const MODEL = process.env.GEMINI_MODEL || "gemini-1.5-flash";
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: MODEL,
    systemInstruction: contextHint
      ? `${VESPERS_SYSTEM_PROMPT}\n\n${contextHint}`
      : VESPERS_SYSTEM_PROMPT,
    generationConfig: {
      temperature: 0.85,
      topP: 0.95,
      maxOutputTokens: 700,
    },
  });

  const priorHistory = session.messages.map((m) => ({
    role: m.role,
    parts: [{ text: m.content }],
  }));

  const chatSession = model.startChat({ history: priorHistory });

  c.header("Content-Type", "text/plain; charset=utf-8");
  c.header("Cache-Control", "no-cache, no-transform");
  c.header("X-Accel-Buffering", "no");
  c.header("X-Vespers-Code", code);
  c.header("X-Vespers-New-Session", isNewSession ? "1" : "0");

  return stream(c, async (s) => {
    let full = "";
    try {
      const result = await chatSession.sendMessageStream(userText);
      for await (const chunk of result.stream) {
        const text = chunk.text();
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
