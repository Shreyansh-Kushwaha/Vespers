import { promises as fs } from "node:fs";
import path from "node:path";

export type Role = "user" | "model";

export interface Message {
  role: Role;
  content: string;
  ts: number;
}

export interface SessionMemory {
  code: string;
  createdAt: number;
  updatedAt: number;
  messages: Message[];
  summary: string;
  themes: string[];
}

interface Store {
  sessions: Record<string, SessionMemory>;
}

const DATA_DIR = path.join(process.cwd(), "data");
const STORE_PATH = path.join(DATA_DIR, "sessions.json");

async function ensureStore(): Promise<Store> {
  try {
    const raw = await fs.readFile(STORE_PATH, "utf8");
    return JSON.parse(raw) as Store;
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const empty: Store = { sessions: {} };
    await fs.writeFile(STORE_PATH, JSON.stringify(empty, null, 2));
    return empty;
  }
}

async function writeStore(store: Store): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(STORE_PATH, JSON.stringify(store, null, 2));
}

export async function getSession(code: string): Promise<SessionMemory | null> {
  const store = await ensureStore();
  return store.sessions[code] ?? null;
}

export async function deleteSession(code: string): Promise<boolean> {
  const store = await ensureStore();
  if (!store.sessions[code]) return false;
  delete store.sessions[code];
  await writeStore(store);
  return true;
}

export async function createSession(code: string): Promise<SessionMemory> {
  const store = await ensureStore();
  const now = Date.now();
  const session: SessionMemory = {
    code,
    createdAt: now,
    updatedAt: now,
    messages: [],
    summary: "",
    themes: [],
  };
  store.sessions[code] = session;
  await writeStore(store);
  return session;
}

export async function appendMessages(code: string, msgs: Message[]): Promise<SessionMemory | null> {
  const store = await ensureStore();
  const session = store.sessions[code];
  if (!session) return null;
  session.messages.push(...msgs);
  // Keep last 60 turns in raw history; older ones live in summary.
  if (session.messages.length > 60) {
    session.messages = session.messages.slice(-60);
  }
  session.updatedAt = Date.now();
  store.sessions[code] = session;
  await writeStore(store);
  return session;
}

export async function updateSummary(
  code: string,
  summary: string,
  themes: string[],
): Promise<void> {
  const store = await ensureStore();
  const session = store.sessions[code];
  if (!session) return;
  session.summary = summary.slice(0, 1200);
  session.themes = themes.slice(0, 12);
  session.updatedAt = Date.now();
  await writeStore(store);
}

export function buildContextHint(session: SessionMemory): string {
  const parts: string[] = [];
  if (session.summary) {
    parts.push(`Quiet memory of past sessions: ${session.summary}`);
  }
  if (session.themes.length) {
    parts.push(`Recurring themes: ${session.themes.join(", ")}.`);
  }
  return parts.join("\n");
}
