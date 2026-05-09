import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8787";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const upstream = await fetch(`${BACKEND_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });

  const headers = new Headers();
  headers.set("Content-Type", upstream.headers.get("Content-Type") || "text/plain; charset=utf-8");
  headers.set("Cache-Control", "no-cache, no-transform");
  const code = upstream.headers.get("X-Vespers-Code");
  if (code) headers.set("X-Vespers-Code", code);
  const isNew = upstream.headers.get("X-Vespers-New-Session");
  if (isNew) headers.set("X-Vespers-New-Session", isNew);

  return new Response(upstream.body, { status: upstream.status, headers });
}
