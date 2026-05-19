import "dotenv/config";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { chatHandler } from "./routes/chat.js";
import { sessionDeleteHandler, sessionHandler } from "./routes/session.js";
import { transcribeHandler } from "./routes/transcribe.js";
import {
  createLetterHandler,
  deleteLetterHandler,
  getLetterHandler,
  listLettersHandler,
  updateLetterHandler,
  whisperLetterHandler,
} from "./routes/letters.js";
import { closingRitualHandler } from "./routes/rituals.js";
import { resourcesHandler } from "./routes/resources.js";

const app = new Hono();

const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "http://localhost:3030";
const allowedOrigins = FRONTEND_ORIGIN.split(",").map((o) => o.trim()).filter(Boolean);
const DEPLOYMENT = process.env.AZURE_OPENAI_DEPLOYMENT || "";
const ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT || "";
const API_VERSION = process.env.AZURE_OPENAI_API_VERSION || "2024-12-01-preview";
const HAS_KEY = Boolean(process.env.AZURE_OPENAI_API_KEY?.trim());
const CONFIGURED = HAS_KEY && Boolean(ENDPOINT) && Boolean(DEPLOYMENT);

app.use(
  "*",
  cors({
    origin: (origin) => {
      if (!origin) return origin ?? "";
      return allowedOrigins.includes(origin) ? origin : "";
    },
    allowHeaders: ["Content-Type"],
    exposeHeaders: [
      "X-Vespers-Code",
      "X-Vespers-New-Session",
      "X-Vespers-Risk-Level",
      "X-Vespers-Risk-Category",
      "X-Vespers-Show-Support",
    ],
    credentials: false,
    maxAge: 600,
  }),
);

app.get("/", (c) =>
  c.json({
    name: "vespers-backend",
    ok: true,
    endpoints: ["POST /api/chat", "GET /api/session?code=VESP-XXXX-XXXX"],
  }),
);

app.get("/health", (c) =>
  c.json({
    ok: true,
    configured: CONFIGURED,
    provider: "azure-openai",
    deployment: DEPLOYMENT,
    apiVersion: API_VERSION,
    corsAllowlist: allowedOrigins,
  }),
);

app.post("/api/chat", chatHandler);
app.get("/api/session", sessionHandler);
app.delete("/api/session", sessionDeleteHandler);
app.post("/api/transcribe", transcribeHandler);
app.post("/api/rituals/closing", closingRitualHandler);
app.get("/api/resources", resourcesHandler);
app.get("/api/letters", listLettersHandler);
app.post("/api/letters", createLetterHandler);
app.get("/api/letters/:id", getLetterHandler);
app.patch("/api/letters/:id", updateLetterHandler);
app.delete("/api/letters/:id", deleteLetterHandler);
app.post("/api/letters/:id/whisper", whisperLetterHandler);

const PORT = Number(process.env.PORT) || 8787;

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_HAS_KEY = Boolean(
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

serve({ fetch: app.fetch, port: PORT }, (info) => {
  console.log("");
  console.log(`  vespers backend → http://localhost:${info.port}`);
  console.log(`    provider   : azure-openai`);
  console.log(`    deployment : ${DEPLOYMENT || "(not set)"}`);
  console.log(`    endpoint   : ${ENDPOINT || "(not set)"}`);
  console.log(`    apiVersion : ${API_VERSION}`);
  console.log(`    cors       : ${allowedOrigins.join(", ") || "(none)"}`);
  console.log(`    storage    : supabase ${SUPABASE_URL ? `(${SUPABASE_URL})` : "(not set)"}`);
  if (CONFIGURED) {
    console.log(`    api key    : configured ✓`);
  } else {
    console.log("");
    console.log("    ⚠  Azure OpenAI is not fully configured.");
    console.log("       Set AZURE_OPENAI_API_KEY, AZURE_OPENAI_ENDPOINT, and");
    console.log("       AZURE_OPENAI_DEPLOYMENT in .env. /api/chat will return 503");
    console.log("       until all three are set.");
  }
  if (!SUPABASE_HAS_KEY) {
    console.log("");
    console.log("    ⚠  Supabase is not configured.");
    console.log("       Set SUPABASE_URL and SUPABASE_KEY in .env, then run");
    console.log("       backend/supabase/schema.sql in your Supabase SQL Editor.");
  }
  console.log("");
});
