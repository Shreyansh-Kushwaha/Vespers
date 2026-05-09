import type { Context } from "hono";
import { getSession } from "../lib/memory.js";
import { isRecoveryCode, normalizeCode } from "../lib/recovery-code.js";

export async function sessionHandler(c: Context) {
  const code = c.req.query("code");
  if (!code || !isRecoveryCode(code)) {
    return c.json({ ok: false, error: "invalid_code" }, 400);
  }
  const session = await getSession(normalizeCode(code));
  if (!session) {
    return c.json({ ok: false, error: "not_found" }, 404);
  }
  return c.json({
    ok: true,
    code: session.code,
    messages: session.messages,
    summary: session.summary,
    themes: session.themes,
  });
}
