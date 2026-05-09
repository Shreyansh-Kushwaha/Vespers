import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8787";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const code = req.nextUrl.searchParams.get("code") || "";
  const upstream = await fetch(
    `${BACKEND_URL}/api/letters/${encodeURIComponent(params.id)}/whisper?code=${encodeURIComponent(code)}`,
    { method: "POST" },
  );
  const text = await upstream.text();
  return new Response(text, {
    status: upstream.status,
    headers: { "Content-Type": upstream.headers.get("Content-Type") || "application/json" },
  });
}
