import * as Localization from "expo-localization";

export type RiskLevel = "low" | "moderate" | "elevated" | "acute";
export type RiskCategory = "self_harm" | "panic" | "abuse" | "hopelessness";

export interface RiskAssessment {
  level: RiskLevel;
  category?: RiskCategory;
  showSupportBanner: boolean;
}

/**
 * Best-effort region guess from the device locale. Returns an ISO 3166-1
 * alpha-2 code or "" if undetectable.
 */
export function guessRegion(): string {
  const locales = Localization.getLocales();
  const region = locales[0]?.regionCode;
  return region ? region.toUpperCase() : "";
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
