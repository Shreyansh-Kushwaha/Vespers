"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { guessRegion, type RiskAssessment } from "@/lib/risk";

interface Resource {
  label: string;
  detail: string;
  href?: string;
  phone?: string;
  text?: string;
}

interface ResourcesResponse {
  ok: boolean;
  region: string | null;
  primary: Resource[];
  global: Resource[];
}

interface Props {
  risk: RiskAssessment | null;
  onDismiss: () => void;
}

/**
 * Quiet, persistent support card. Sits above the input. Editorial paper tone —
 * not red, not alarming, not gamified. Surfaces gentle resources and a
 * grounding suggestion. User can dismiss; banner re-appears if subsequent
 * messages also flag elevated distress.
 */
export function CrisisSupport({ risk, onDismiss }: Props) {
  const [resources, setResources] = useState<ResourcesResponse | null>(null);

  useEffect(() => {
    if (!risk?.showSupportBanner) return;
    const region = guessRegion();
    fetch(`/api/resources?region=${encodeURIComponent(region)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: ResourcesResponse | null) => {
        if (d?.ok) setResources(d);
      })
      .catch(() => {});
  }, [risk?.showSupportBanner]);

  const grounding =
    risk?.category === "panic"
      ? "if it helps, try the 4-7-8 breath: inhale for 4, hold for 7, exhale slowly for 8. three rounds."
      : risk?.category === "abuse"
        ? "you don't have to figure this out alone. a hotline can help you think through next steps without commitment."
        : "you deserve support beyond carrying this alone.";

  const visible = !!risk?.showSupportBanner;

  return (
    <AnimatePresence>
      {visible && (
        <motion.aside
          key="crisis"
          initial={{ opacity: 0, y: 8, filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: 6, filter: "blur(4px)" }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          role="complementary"
          aria-label="support"
          className="bg-paperDeep/70 border border-rule px-5 sm:px-6 py-4 sm:py-5"
        >
          <div className="grid grid-cols-[1fr_auto] gap-4 items-start">
            <div className="space-y-3">
              <div className="eyebrow text-aubergine/90">support</div>
              <p className="display text-[15px] sm:text-[16px] leading-[1.7] text-ink/90 italic">
                {grounding}
              </p>
              {resources && (
                <ul className="hairline pt-3 space-y-2">
                  {[...resources.primary, ...resources.global]
                    .slice(0, 4)
                    .map((r, i) => (
                      <li key={i} className="text-[14px] leading-[1.6]">
                        <span className="display italic text-aubergine">
                          {r.label}
                        </span>
                        <span className="text-margin">  ·  </span>
                        <span className="text-inkSoft">{r.detail}</span>
                        {r.href && (
                          <>
                            <span className="text-margin">  ·  </span>
                            <a
                              href={r.href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ink-link"
                            >
                              open
                            </a>
                          </>
                        )}
                      </li>
                    ))}
                </ul>
              )}
            </div>
            <button
              type="button"
              onClick={onDismiss}
              aria-label="hide support"
              className="eyebrow text-margin hover:text-aubergine transition-colors -mt-1"
            >
              hide
            </button>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
