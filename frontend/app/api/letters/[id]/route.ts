import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8787";

function buildUrl(id: string, code: string): string {
  return `${BACKEND_URL}/api/letters/${encodeURIComponent(id)}?code=${encodeURIComponent(code)}`;
}

async function relay(upstream: Response): Promise<Response> {
  const text = await upstream.text();
  return new Response(text, {
    status: upstream.status,
    headers: { "Content-Type": upstream.headers.get("Content-Type") || "application/json" },
  });
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const code = req.nextUrl.searchParams.get("code") || "";
  return relay(await fetch(buildUrl(params.id, code)));
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const code = req.nextUrl.searchParams.get("code") || "";
  const body = await req.text();
  return relay(
    await fetch(buildUrl(params.id, code), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body,
    }),
  );
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const code = req.nextUrl.searchParams.get("code") || "";
  return relay(await fetch(buildUrl(params.id, code), { method: "DELETE" }));
}
