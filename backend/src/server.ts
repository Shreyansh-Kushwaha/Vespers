import "dotenv/config";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { chatHandler } from "./routes/chat.js";
import { sessionHandler } from "./routes/session.js";

const app = new Hono();

const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "http://localhost:3030";
const allowedOrigins = FRONTEND_ORIGIN.split(",").map((o) => o.trim()).filter(Boolean);

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

app.get("/health", (c) => c.json({ ok: true }));

app.post("/api/chat", chatHandler);
app.get("/api/session", sessionHandler);

const PORT = Number(process.env.PORT) || 8787;

serve({ fetch: app.fetch, port: PORT }, (info) => {
  console.log(`vespers backend → http://localhost:${info.port}`);
  console.log(`cors allowlist: ${allowedOrigins.join(", ") || "(none)"}`);
});
