import type { Context } from "hono";

const HF_DEFAULT_MODEL = "openai/whisper-large-v3";

export async function transcribeHandler(c: Context) {
  const azureKey = process.env.AZURE_OPENAI_API_KEY;
  const azureEndpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const azureDeployment = process.env.AZURE_OPENAI_TRANSCRIBE_DEPLOYMENT;
  const azureApiVersion = process.env.AZURE_OPENAI_API_VERSION || "2024-12-01-preview";

  const hfToken = process.env.HF_API_TOKEN;
  const hfModel = process.env.HF_TRANSCRIBE_MODEL || HF_DEFAULT_MODEL;

  const useAzure = Boolean(azureKey && azureEndpoint && azureDeployment);
  const useHF = !useAzure && Boolean(hfToken);

  if (!useAzure && !useHF) {
    return c.text(
      "Transcription is not configured. Set AZURE_OPENAI_TRANSCRIBE_DEPLOYMENT or HF_API_TOKEN in .env.",
      503,
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await c.req.parseBody();
  } catch {
    return c.text("invalid form data", 400);
  }

  const audio = body.audio;
  if (!(audio instanceof File) && !(audio instanceof Blob)) {
    return c.text("missing audio file in form field 'audio'", 400);
  }

  if (useAzure) {
    const filename = audio instanceof File ? audio.name : "audio.webm";
    const fd = new FormData();
    fd.append("file", audio, filename);
    fd.append("model", azureDeployment!);
    fd.append("response_format", "text");
    const url = `${azureEndpoint}/openai/deployments/${azureDeployment}/audio/transcriptions?api-version=${azureApiVersion}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "api-key": azureKey! },
      body: fd,
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return c.text(`transcription failed (${res.status}): ${errText}`, 502);
    }
    const text = (await res.text()).trim();
    return c.json({ ok: true, text, provider: "azure" });
  }

  // Hugging Face Inference (current Router gateway, OpenAI-compatible audio).
  // The legacy `api-inference.huggingface.co/models/...` host returns 404 for
  // ASR models since the 2025 migration to Inference Providers.
  const filename = audio instanceof File ? audio.name : "audio.webm";
  const audioType = (audio as File).type || "audio/webm";

  type FetchBody = FormData | Uint8Array;
  const audioBytes = new Uint8Array(await audio.arrayBuffer());

  const attempts: Array<{ label: string; url: string; body: FetchBody; headers: Record<string, string> }> = [
    // Current (HF Inference Providers, raw bytes).
    {
      label: "router/hf-inference/models",
      url: `https://router.huggingface.co/hf-inference/models/${hfModel}`,
      headers: {
        Authorization: `Bearer ${hfToken}`,
        "Content-Type": audioType,
      },
      body: audioBytes,
    },
    // OpenAI-compatible audio/transcriptions on the router (multipart form).
    {
      label: "router/v1/audio/transcriptions",
      url: "https://router.huggingface.co/hf-inference/v1/audio/transcriptions",
      headers: { Authorization: `Bearer ${hfToken}` },
      body: (() => {
        const fd = new FormData();
        fd.append("file", audio, filename);
        fd.append("model", hfModel);
        fd.append("response_format", "json");
        return fd;
      })(),
    },
    // Legacy host kept as last resort.
    {
      label: "legacy/api-inference/models",
      url: `https://api-inference.huggingface.co/models/${hfModel}`,
      headers: {
        Authorization: `Bearer ${hfToken}`,
        "Content-Type": audioType,
      },
      body: audioBytes,
    },
  ];

  const errors: string[] = [];
  for (const a of attempts) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const res = await fetch(a.url, { method: "POST", headers: a.headers, body: a.body });
      if (res.ok) {
        const data = (await res.json().catch(async () => ({ text: await res.text() }))) as {
          text?: string;
        };
        const text = (data.text || "").trim();
        return c.json({ ok: true, text, provider: "huggingface", route: a.label });
      }
      const errText = await res.text().catch(() => "");
      const summary = `[${a.label}] ${res.status} ${errText.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim().slice(0, 200)}`;
      console.warn("[transcribe]", summary);
      const looksLikeColdStart =
        res.status === 503 || /loading|warm/i.test(errText);
      if (looksLikeColdStart && attempt === 0) {
        await new Promise((r) => setTimeout(r, 4000));
        continue;
      }
      errors.push(summary);
      break;
    }
  }

  return c.text(`transcription failed:\n${errors.join("\n")}`, 502);
}
