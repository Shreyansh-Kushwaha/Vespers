import { apiUrl } from "./api";
import { readRiskFromHeaders, type RiskAssessment, guessRegion } from "./risk";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface SendChatResult {
  reply: string;
  code: string | null;
  newSession: boolean;
  risk: RiskAssessment;
}

/**
 * Send a chat turn. The backend streams text/plain chunks; React Native's
 * fetch does NOT support `response.body.getReader()` reliably across engines,
 * so we fall back to reading the full body as text once the stream completes.
 *
 * The trade-off: no token-by-token UI animation on mobile yet. That can be
 * added later via expo/fetch's streaming support or a custom EventSource lib.
 */
export async function sendChat(params: {
  code: string | null;
  history: ChatMessage[];
  message: string;
  onChunk?: (full: string) => void;
}): Promise<SendChatResult> {
  const { code, history, message, onChunk } = params;
  const res = await fetch(apiUrl("/api/chat"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      code,
      message,
      history,
      region: guessRegion(),
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`chat failed: ${res.status} ${errText}`);
  }

  const reply = await res.text();
  if (onChunk) onChunk(reply);

  return {
    reply,
    code: res.headers.get("X-Vespers-Code"),
    newSession: res.headers.get("X-Vespers-New-Session") === "1",
    risk: readRiskFromHeaders(res.headers),
  };
}

export async function loadSession(code: string): Promise<ChatMessage[]> {
  const res = await fetch(apiUrl(`/api/session?code=${encodeURIComponent(code)}`));
  if (!res.ok) return [];
  const data = (await res.json()) as {
    ok: boolean;
    messages?: ChatMessage[];
  };
  return data.messages ?? [];
}
