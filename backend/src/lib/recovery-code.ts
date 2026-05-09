const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I, O, 0, 1 → easier to read aloud

function randomBlock(len: number): string {
  let out = "";
  for (let i = 0; i < len; i++) {
    out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return out;
}

export function generateRecoveryCode(): string {
  return `VESP-${randomBlock(4)}-${randomBlock(4)}`;
}

const CODE_RE = /^VESP-[A-Z0-9]{4}-[A-Z0-9]{4}$/i;

export function isRecoveryCode(input: string): boolean {
  return CODE_RE.test(input.trim());
}

export function normalizeCode(input: string): string {
  return input.trim().toUpperCase();
}
