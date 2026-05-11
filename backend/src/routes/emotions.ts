import type { Context } from "hono";
import { EMOTION_CATALOG } from "../lib/emotions.js";

/**
 * GET /api/emotions — returns the full emotion-wheel catalog. Static data
 * (no per-user state), safe to cache.
 */
export async function emotionsHandler(c: Context) {
  c.header("Cache-Control", "public, max-age=300");
  return c.json({ primaries: EMOTION_CATALOG });
}
