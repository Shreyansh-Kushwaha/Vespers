export type RiskLevel = "low" | "moderate" | "elevated" | "acute";
export type RiskCategory = "self_harm" | "panic" | "abuse" | "hopelessness";

export interface RiskAssessment {
  level: RiskLevel;
  category?: RiskCategory;
  showSupportBanner: boolean;
}

/**
 * Best-effort region guess from the browser locale. Returns an ISO 3166-1
 * alpha-2 code or "" if undetectable.
 */
export function guessRegion(): string {
  if (typeof navigator === "undefined") return "";
  const loc = (navigator.language || "").toUpperCase();
  // "en-US" → "US", "hi-IN" → "IN", etc.
  const parts = loc.split("-");
  if (parts.length >= 2) return parts[parts.length - 1];
  return "";
}

export function readRiskFromHeaders(headers: Headers): RiskAssessment {
  const level = (headers.get("X-Vespers-Risk-Level") || "low") as RiskLevel;
  const category = headers.get("X-Vespers-Risk-Category") || undefined;
  const show = headers.get("X-Vespers-Show-Support") === "1";
  return {
    level,
    category: category ? (category as RiskCategory) : undefined,
    showSupportBanner: show,
  };
}
