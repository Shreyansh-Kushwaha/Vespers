"use client";

import { useEffect, useRef } from "react";

/**
 * Calls `onIdle` when the user has been inactive for `idleMs` since the last
 * call to `bump()`. Returns a `bump` function the caller invokes whenever
 * activity should reset the timer (e.g. on send, on input, on focus).
 *
 * The timer is paused while `enabled` is false and resumed when it flips back.
 */
export function useInactivity(
  enabled: boolean,
  idleMs: number,
  onIdle: () => void,
): { bump: () => void } {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onIdleRef = useRef(onIdle);
  onIdleRef.current = onIdle;

  const clear = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const start = () => {
    clear();
    timerRef.current = setTimeout(() => onIdleRef.current(), idleMs);
  };

  useEffect(() => {
    if (!enabled) {
      clear();
      return;
    }
    start();
    return clear;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, idleMs]);

  return {
    bump: () => {
      if (enabled) start();
    },
  };
}
