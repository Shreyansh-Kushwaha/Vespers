import "dotenv/config";
import path from "node:path";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { chatHandler } from "./routes/chat.js";
import { sessionHandler } from "./routes/session.js";

const app = new Hono();

const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "http://localhost:3030";
const allowedOrigins = FRONTEND_ORIGIN.split(",").map((o) => o.trim()).filter(Boolean);
const MODEL = process.env.GEMINI_MODEL || "gemini-1.5-flash";
const HAS_KEY = Boolean(process.env.GEMINI_API_KEY?.trim());

app.use(
  "*",
  cors({
    origin: (origin) => {
      // No origin (e.g. curl) is allowed; otherwise match the allowlist.
      if (!origin) return origin ?? "";
      return allowedOrigins.includes(origin) ? origin : "";
    },
    allowHeaders: ["Content-Type"],
    exposeHeaders: ["X-Vespers-Code", "X-Vespers-New-Session"],
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
    configured: HAS_KEY,
    model: MODEL,
    corsAllowlist: allowedOrigins,
  }),
);

app.post("/api/chat", chatHandler);
app.get("/api/session", sessionHandler);

const PORT = Number(process.env.PORT) || 8787;

serve({ fetch: app.fetch, port: PORT }, (info) => {
  const dataPath = path.join(process.cwd(), "data", "sessions.json");
  console.log("");
  console.log(`  vespers backend → http://localhost:${info.port}`);
  console.log(`    model   : ${MODEL}`);
  console.log(`    cors    : ${allowedOrigins.join(", ") || "(none)"}`);
  console.log(`    memory  : ${dataPath}`);
  if (HAS_KEY) {
    console.log(`    api key : configured ✓`);
  } else {
    console.log("");
    console.log("    ⚠  GEMINI_API_KEY is not set.");
    console.log("       /api/chat will return 503 until you add it to .env.");
    console.log("       free key: https://aistudio.google.com/apikey");
  }
  console.log("");
});
