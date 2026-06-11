import type { Context } from "hono";
import { deleteSession, getSession } from "../lib/memory.js";
import { isRecoveryCode, normalizeCode } from "../lib/recovery-code.js";

function sessionPayload(session: Awaited<ReturnType<typeof getSession>>) {
  if (!session) return null;
  return {
    ok: true,
    code: session.code,
    messages: session.messages,
    memory: session.memory,
    closingRituals: session.closingRituals,
  };
}

/** Legacy GET — code in query string. Kept for backwards compat (mobile). */
export async function sessionHandler(c: Context) {
  const code = c.req.query("code");
  if (!code || !isRecoveryCode(code)) {
    return c.json({ ok: false, error: "invalid_code" }, 400);
  }
  const session = await getSession(normalizeCode(code));
  if (!session) return c.json({ ok: false, error: "not_found" }, 404);
  return c.json(sessionPayload(session));
}

/** POST /api/session — code in request body (preferred: keeps code out of logs). */
export async function sessionLoadHandler(c: Context) {
  let code: string | null = null;
  try {
    const body = (await c.req.json()) as { code?: string };
    code = typeof body.code === "string" ? body.code.trim() : null;
  } catch {
    return c.json({ ok: false, error: "invalid_body" }, 400);
  }
  if (!code || !isRecoveryCode(code)) {
    return c.json({ ok: false, error: "invalid_code" }, 400);
  }
  const session = await getSession(normalizeCode(code));
  if (!session) return c.json({ ok: false, error: "not_found" }, 404);
  return c.json(sessionPayload(session));
}

export async function sessionDeleteHandler(c: Context) {
  const code = c.req.query("code");
  if (!code || !isRecoveryCode(code)) {
    return c.json({ ok: false, error: "invalid_code" }, 400);
  }
  const removed = await deleteSession(normalizeCode(code));
  return c.json({ ok: true, deleted: removed });
}
