import type { Context } from "hono";
import { appendClosingRitual } from "../lib/memory.js";
import { isRecoveryCode, normalizeCode } from "../lib/recovery-code.js";

interface ClosingBody {
  code?: string;
  carrying?: string;
  releasing?: string;
  intention?: string;
}

export async function closingRitualHandler(c: Context) {
  let body: ClosingBody;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ ok: false, error: "invalid_json" }, 400);
  }

  const code = body.code ? normalizeCode(body.code) : "";
  if (!code || !isRecoveryCode(code)) {
    return c.json({ ok: false, error: "invalid_code" }, 400);
  }

  const carrying = (body.carrying ?? "").trim().slice(0, 600);
  const releasing = (body.releasing ?? "").trim().slice(0, 600);
  const intention = (body.intention ?? "").trim().slice(0, 600);

  if (!carrying && !releasing && !intention) {
    return c.json({ ok: false, error: "empty" }, 400);
  }

  const ok = await appendClosingRitual(code, {
    ts: Date.now(),
    carrying,
    releasing,
    intention,
  });
  if (!ok) return c.json({ ok: false, error: "save_failed" }, 500);
  return c.json({ ok: true });
}
