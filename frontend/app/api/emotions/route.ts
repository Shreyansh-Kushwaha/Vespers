export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8787";

export async function GET() {
  const upstream = await fetch(`${BACKEND_URL}/api/emotions`, {
    method: "GET",
  });
  const body = await upstream.text();
  return new Response(body, {
    status: upstream.status,
    headers: {
      "Content-Type": upstream.headers.get("Content-Type") || "application/json",
      "Cache-Control": "public, max-age=300",
    },
  });
}
