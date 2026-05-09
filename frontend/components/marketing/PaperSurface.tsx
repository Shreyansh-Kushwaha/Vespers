"use client";

import { useEffect } from "react";

/**
 * Toggles a `paper-surface` class on <body> for the duration of this route.
 * Lets globals.css swap the page background and ::selection without a layout
 * file rewrite per route.
 */
export function PaperSurface() {
  useEffect(() => {
    document.body.classList.add("paper-surface");
    return () => document.body.classList.remove("paper-surface");
  }, []);
  return null;
}
