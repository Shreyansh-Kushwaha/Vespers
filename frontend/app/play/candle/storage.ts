/**
 * Local-only memory of the longest candle burn from a previous session.
 * Stored under the user's recovery code? — no. The candle is intentionally
 * separate from the rest of Vespers; the only thread back to a past session
 * is this single line, and only on the same device.
 */
const KEY_LAST_BURN = "vespers.candle.lastBurnMs";
const KEY_LAST_DATE = "vespers.candle.lastDate";

export interface CandleMemory {
  burnedMs: number;
  date: string; // ISO
}

export function loadMemory(): CandleMemory | null {
  try {
    const burned = localStorage.getItem(KEY_LAST_BURN);
    const date = localStorage.getItem(KEY_LAST_DATE);
    if (!burned || !date) return null;
    const ms = parseInt(burned, 10);
    if (!Number.isFinite(ms) || ms < 1000) return null;
    return { burnedMs: ms, date };
  } catch { return null; }
}

/** Save only if this session beat the prior longest burn. */
export function saveMemory(burnedMs: number): void {
  try {
    if (burnedMs < 1000) return;
    const prev = loadMemory();
    if (prev && prev.burnedMs >= burnedMs) return;
    localStorage.setItem(KEY_LAST_BURN, String(burnedMs));
    localStorage.setItem(KEY_LAST_DATE, new Date().toISOString());
  } catch { /* localStorage may be unavailable in private mode */ }
}

export function describeMemory(m: CandleMemory): string {
  const totalSec = Math.floor(m.burnedMs / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  const dur = min > 0
    ? (sec > 30 ? `${min}m ${sec}s` : `${min}m`)
    : `${Math.max(sec, 1)}s`;

  const last = new Date(m.date);
  const today = new Date();
  const daysAgo = Math.floor(
    (Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()) -
      Date.UTC(last.getFullYear(), last.getMonth(), last.getDate())) /
      (24 * 60 * 60 * 1000),
  );
  let when: string;
  if (daysAgo <= 0) when = "earlier today";
  else if (daysAgo === 1) when = "yesterday";
  else if (daysAgo < 7) when = `${daysAgo} days ago`;
  else when = "last time";

  return `you sat with one for ${dur}, ${when}.`;
}
