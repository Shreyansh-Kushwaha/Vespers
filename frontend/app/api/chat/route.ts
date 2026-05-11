import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8787";

const FORWARD_HEADERS = [
  "X-Vespers-Code",
  "X-Vespers-New-Session",
  "X-Vespers-Risk-Level",
  "X-Vespers-Risk-Category",
  "X-Vespers-Show-Support",
  "X-Vespers-Persona",
  "X-Vespers-Persona-Requested",
];

export async function POST(req: NextRequest) {
  const body = await req.text();
  const upstream = await fetch(`${BACKEND_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });

  const headers = new Headers();
  headers.set(
    "Content-Type",
    upstream.headers.get("Content-Type") || "text/plain; charset=utf-8",
  );
  headers.set("Cache-Control", "no-cache, no-transform");
  for (const h of FORWARD_HEADERS) {
    const v = upstream.headers.get(h);
    if (v) headers.set(h, v);
  }

  return new Response(upstream.body, { status: upstream.status, headers });
}
