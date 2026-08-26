"use client";

import { useEffect } from "react";
import { useSettingsStore } from "@/store/useSettingsStore";

/**
 * Toggles the global pixel-cursor stylesheet rules (see globals.css)
 * on <body> based on the Settings > Cursor preference. No cursor logic
 * lives here — this just flips the class the CSS keys off of, so it
 * mounts once, high in the tree, and applies to the boot screen too.
 */
export function CursorProvider() {
  const cursorEnabled = useSettingsStore((s) => s.cursorEnabled);

  useEffect(() => {
    document.body.classList.toggle("cattipu-cursors", cursorEnabled);
  }, [cursorEnabled]);

  return null;
}
