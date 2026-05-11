import { getSupabase, SESSIONS_TABLE } from "./supabase.js";

export type Role = "user" | "model";
export type Persona = "vespers" | "gappu";

export interface Message {
  role: Role;
  content: string;
  ts: number;
  /** Thread the message belongs to — always set to the persona the user was
   *  in when they sent the turn. Drives filtering: switching personas in the
   *  UI shows only that persona's thread. Optional — older messages predate
   *  this field and are treated as "vespers" by default. */
  persona?: Persona;
  /** Only set on assistant messages when a crisis override flipped the
   *  effective persona away from the requested one (e.g. Gappu was requested
   *  but Vespers stepped in for the turn). Drives bubble styling so the
   *  reply still visually reads as the stand-in. */
  replyPersona?: Persona;
}

export interface SessionMemory {
  // Structured emotional context — preserved across summarisation cycles.
  emotionalThemes: string[];
  recurringConcerns: string[];
  copingStrategies: string[];
  personalWins: string[];
  unresolvedTopics: string[];
  relationshipPatterns: string[];
  summary: string;
}

export const EMPTY_MEMORY: SessionMemory = {
  emotionalThemes: [],
  recurringConcerns: [],
  copingStrategies: [],
  personalWins: [],
  unresolvedTopics: [],
  relationshipPatterns: [],
  summary: "",
};

export interface ClosingRitual {
  ts: number;
  carrying: string;
  releasing: string;
  intention: string;
}

export interface Session {
  code: string;
  createdAt: number;
  updatedAt: number;
  messages: Message[];
  memory: SessionMemory;
  closingRituals: ClosingRitual[];
}

interface Row {
  code: string;
  created_at: number;
  updated_at: number;
  messages: Message[] | null;
  memory: Partial<SessionMemory> | null;
  closing_rituals: ClosingRitual[] | null;
}

function rowToSession(r: Row): Session {
  return {
    code: r.code,
    createdAt: Number(r.created_at),
    updatedAt: Number(r.updated_at),
    messages: r.messages ?? [],
    memory: { ...EMPTY_MEMORY, ...(r.memory ?? {}) },
    closingRituals: r.closing_rituals ?? [],
  };
}

const COLUMNS = "code, created_at, updated_at, messages, memory, closing_rituals";

export async function getSession(code: string): Promise<Session | null> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from(SESSIONS_TABLE)
    .select(COLUMNS)
    .eq("code", code)
    .maybeSingle();
  if (error) {
    console.warn("[memory] getSession error:", error.message);
    return null;
  }
  return data ? rowToSession(data as Row) : null;
}

export async function createSession(code: string): Promise<Session> {
  const now = Date.now();
  const sb = getSupabase();
  const { error } = await sb.from(SESSIONS_TABLE).insert({
    code,
    created_at: now,
    updated_at: now,
    messages: [],
    memory: EMPTY_MEMORY,
    closing_rituals: [],
  });
  if (error) {
    console.warn("[memory] createSession error:", error.message);
  }
  return {
    code,
    createdAt: now,
    updatedAt: now,
    messages: [],
    memory: EMPTY_MEMORY,
    closingRituals: [],
  };
}

export async function deleteSession(code: string): Promise<boolean> {
  const sb = getSupabase();
  const { error, count } = await sb
    .from(SESSIONS_TABLE)
    .delete({ count: "exact" })
    .eq("code", code);
  if (error) {
    console.warn("[memory] deleteSession error:", error.message);
    return false;
  }
  return (count ?? 0) > 0;
}

export async function appendMessages(
  code: string,
  msgs: Message[],
): Promise<Session | null> {
  const existing = await getSession(code);
  if (!existing) return null;
  const merged = [...existing.messages, ...msgs];
  const updatedAt = Date.now();
  const sb = getSupabase();
  const { error } = await sb
    .from(SESSIONS_TABLE)
    .update({ messages: merged, updated_at: updatedAt })
    .eq("code", code);
  if (error) {
    console.warn("[memory] appendMessages error:", error.message);
    return null;
  }
  return { ...existing, messages: merged, updatedAt };
}

/**
 * Replace messages + structured memory atomically. Used by the summariser
 * after it folds older turns into structured memory.
 */
export async function replaceMemoryAndMessages(
  code: string,
  memory: SessionMemory,
  messages: Message[],
): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb
    .from(SESSIONS_TABLE)
    .update({ memory, messages, updated_at: Date.now() })
    .eq("code", code);
  if (error) {
    console.warn("[memory] replaceMemoryAndMessages error:", error.message);
  }
}

export async function appendClosingRitual(
  code: string,
  ritual: ClosingRitual,
): Promise<boolean> {
  const session = await getSession(code);
  if (!session) return false;
  const merged = [...session.closingRituals, ritual];
  const sb = getSupabase();
  const { error } = await sb
    .from(SESSIONS_TABLE)
    .update({ closing_rituals: merged, updated_at: Date.now() })
    .eq("code", code);
  if (error) {
    console.warn("[memory] appendClosingRitual error:", error.message);
    return false;
  }
  return true;
}
