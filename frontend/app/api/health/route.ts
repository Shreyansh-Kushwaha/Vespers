import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8787";

export async function GET(_req: NextRequest) {
  // Long-ish timeout because Render's free tier cold-start can take 30–60s.
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 90_000);
  try {
    const upstream = await fetch(`${BACKEND_URL}/health`, { signal: ctrl.signal });
    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: {
        "Content-Type": upstream.headers.get("Content-Type") || "application/json",
      },
    });
  } catch (err) {
    const reason = err instanceof Error ? err.name : "fetch_failed";
    return new Response(JSON.stringify({ ok: false, error: reason }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  } finally {
    clearTimeout(timer);
  }
}
