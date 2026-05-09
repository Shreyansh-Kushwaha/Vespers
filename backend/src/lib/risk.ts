/**
 * Lightweight, privacy-preserving heuristic classifier. Runs on the user's
 * latest message, in-process, never logged externally.
 *
 * This is NOT clinical screening. Its only job is to decide whether the UI
 * should surface a soft, non-blocking support banner. It biases toward
 * gentle false-positives over silence, and never blocks conversation.
 */

export type RiskLevel = "low" | "moderate" | "elevated" | "acute";
export type RiskCategory = "self_harm" | "panic" | "abuse" | "hopelessness";

export interface RiskAssessment {
  level: RiskLevel;
  category?: RiskCategory;
  showSupportBanner: boolean;
}

interface PhraseRule {
  category: RiskCategory;
  level: RiskLevel;
  patterns: RegExp[];
}

// Order matters: acute > elevated > moderate. First strong match wins.
const RULES: PhraseRule[] = [
  {
    category: "self_harm",
    level: "acute",
    patterns: [
      /\bkill (myself|my self)\b/i,
      /\b(end|ending) my life\b/i,
      /\bsuicide\b/i,
      /\bsuicidal\b/i,
      /\b(want|wanting|going|ready) to die\b/i,
      /\b(don'?t|do not|no longer) want(ing)? to (be alive|live|exist|be here)\b/i,
      /\b(not|no longer) want(ing)? to (be alive|live|exist|be here)\b/i,
      /\b(want|wanting|wish|wishing) (to )?(stop|to stop) (existing|being here|living)\b/i,
      /\bi want it (all )?to (end|stop)\b/i,
      /\boverdose\b/i,
      /\bhang myself\b/i,
      /\b(slit|cut) my (wrists|throat)\b/i,
      /\btake (all )?(the |my )?pills\b/i,
      /\bjump off\b/i,
    ],
  },
  {
    category: "self_harm",
    level: "elevated",
    patterns: [
      /\bself[- ]?harm\b/i,
      /\bhurt(ing)? myself\b/i,
      /\bcut(ting)? myself\b/i,
      /\bburn(ing)? myself\b/i,
      /\bi('?m| am) (a )?(burden|worthless|useless)\b/i,
      /\beveryone (would|will) be better off without me\b/i,
      /\bno (point|reason) (in )?(living|being here)\b/i,
    ],
  },
  {
    category: "abuse",
    level: "elevated",
    patterns: [
      /\b(he|she|they) (hits?|beats?|hurts?|chokes?|strangles?) me\b/i,
      /\b(being|feel|getting) abused\b/i,
      /\bdomestic (violence|abuse)\b/i,
      /\bafraid (to|of) (go(ing)? )?home\b/i,
      /\bnot safe (at|in) (home|here)\b/i,
    ],
  },
  {
    category: "panic",
    level: "elevated",
    patterns: [
      /\b(can'?t|cannot) breathe\b/i,
      /\bpanic attack\b/i,
      /\bheart racing\b/i,
      /\bchest tight(ening)?\b/i,
      /\bi('?m| am) (going to|gonna) (faint|pass out|lose it)\b/i,
    ],
  },
  {
    category: "hopelessness",
    level: "elevated",
    patterns: [
      /\bnothing matters( anymore)?\b/i,
      /\bgive ?up( on (life|everything))?\b/i,
      /\b(can'?t|cannot) (do|take) (this|it) (anymore|any more)\b/i,
      /\b(everything|nothing) (is )?(pointless|hopeless)\b/i,
      /\bi('?m| am) (so )?(empty|numb|exhausted) (anymore)?\b/i,
    ],
  },
  {
    category: "hopelessness",
    level: "moderate",
    patterns: [
      /\boverwhelmed\b/i,
      /\bcrying( all the time)?\b/i,
      /\b(deeply|so) (sad|alone|lost)\b/i,
      /\bdon'?t know (what to do|how to keep going)\b/i,
    ],
  },
];

/**
 * Score the most recent user message. We only consider the latest message —
 * historical context is the model's job, not the heuristic's.
 */
export function classifyRisk(latestUserMessage: string): RiskAssessment {
  const text = (latestUserMessage || "").toLowerCase().normalize("NFKC");
  if (!text.trim()) return { level: "low", showSupportBanner: false };

  for (const rule of RULES) {
    for (const p of rule.patterns) {
      if (p.test(text)) {
        return {
          level: rule.level,
          category: rule.category,
          showSupportBanner: rule.level === "elevated" || rule.level === "acute",
        };
      }
    }
  }
  return { level: "low", showSupportBanner: false };
}

// ───────────────────────────────────────────────────────────────────────────
// Resources
// Region keys follow ISO 3166-1 alpha-2. Add or override freely.
// ───────────────────────────────────────────────────────────────────────────

export interface Resource {
  label: string;
  detail: string;
  href?: string;
  phone?: string;
  text?: string;
}

const GLOBAL_FALLBACK: Resource[] = [
  {
    label: "find a helpline",
    detail: "international directory of crisis lines, region by region",
    href: "https://findahelpline.com",
  },
];

const REGION_RESOURCES: Record<string, Resource[]> = {
  US: [
    {
      label: "988 suicide & crisis lifeline",
      detail: "free, confidential, 24/7. call or text 988.",
      phone: "988",
    },
    {
      label: "crisis text line",
      detail: "text HOME to 741741",
      text: "741741",
    },
  ],
  GB: [
    {
      label: "samaritans",
      detail: "free, confidential, 24/7. call 116 123.",
      phone: "116123",
    },
    {
      label: "shout",
      detail: "text SHOUT to 85258",
      text: "85258",
    },
  ],
  IN: [
    {
      label: "iCall",
      detail: "9152987821 · mon–sat, 8am–10pm",
      phone: "9152987821",
    },
    {
      label: "vandrevala foundation",
      detail: "1860-2662-345 · 24/7",
      phone: "18602662345",
    },
  ],
  CA: [
    {
      label: "9-8-8 suicide crisis helpline",
      detail: "free, 24/7. call or text 988.",
      phone: "988",
    },
  ],
  AU: [
    {
      label: "lifeline",
      detail: "13 11 14 · 24/7",
      phone: "131114",
    },
  ],
};

/**
 * Look up resources for a region (best effort). Returns at most ~3 entries
 * plus a global fallback link.
 */
export function getResources(region?: string): {
  region: string | null;
  primary: Resource[];
  global: Resource[];
} {
  const key = (region || "").toUpperCase();
  const primary = REGION_RESOURCES[key];
  return {
    region: primary ? key : null,
    primary: primary ?? [],
    global: GLOBAL_FALLBACK,
  };
}
