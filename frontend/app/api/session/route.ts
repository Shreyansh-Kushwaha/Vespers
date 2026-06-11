import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8787";

/** POST /api/session — preferred: code travels in body, never in server logs. */
export async function POST(req: NextRequest) {
  const body = await req.text();
  const upstream = await fetch(`${BACKEND_URL}/api/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
  const text = await upstream.text();
  return new Response(text, {
    status: upstream.status,
    headers: {
      "Content-Type": upstream.headers.get("Content-Type") || "application/json",
    },
  });
}

/** GET — kept for mobile/legacy clients that pass code in query string. */
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code") || "";
  const upstream = await fetch(
    `${BACKEND_URL}/api/session?code=${encodeURIComponent(code)}`,
    { method: "GET" },
  );
  const text = await upstream.text();
  return new Response(text, {
    status: upstream.status,
    headers: {
      "Content-Type": upstream.headers.get("Content-Type") || "application/json",
    },
  });
}

export async function DELETE(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code") || "";
  const upstream = await fetch(
    `${BACKEND_URL}/api/session?code=${encodeURIComponent(code)}`,
    { method: "DELETE" },
  );
  const text = await upstream.text();
  return new Response(text, {
    status: upstream.status,
    headers: {
      "Content-Type": upstream.headers.get("Content-Type") || "application/json",
    },
  });
}
