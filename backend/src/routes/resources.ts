import type { Context } from "hono";
import { getResources } from "../lib/risk.js";

export async function resourcesHandler(c: Context) {
  const region = c.req.query("region") || "";
  return c.json({ ok: true, ...getResources(region) });
}
