import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8787";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code") || "";
  const upstream = await fetch(
    `${BACKEND_URL}/api/letters?code=${encodeURIComponent(code)}`,
  );
  const text = await upstream.text();
  return new Response(text, {
    status: upstream.status,
    headers: { "Content-Type": upstream.headers.get("Content-Type") || "application/json" },
  });
}

export async function POST(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code") || "";
  const body = await req.text();
  const upstream = await fetch(
    `${BACKEND_URL}/api/letters?code=${encodeURIComponent(code)}`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body },
  );
  const text = await upstream.text();
  return new Response(text, {
    status: upstream.status,
    headers: { "Content-Type": upstream.headers.get("Content-Type") || "application/json" },
  });
}
