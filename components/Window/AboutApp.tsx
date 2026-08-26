"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PixelLogo } from "../Boot/PixelLogo";
import { CATTIPU_VERSION, CATTIPU_BUILD, CATTIPU_TAGLINE } from "@/lib/version";
import { useUiSound } from "@/lib/useUiSound";

const EASTER_EGG_CLICKS = 5;

export function AboutApp() {
  const [clicks, setClicks] = useState(0);
  const [unlocked, setUnlocked] = useState(false);
  const resetTimer = useRef<number | null>(null);
  const playSound = useUiSound();

  const onThumbClick = () => {
    if (unlocked) return;
    const next = clicks + 1;
    setClicks(next);

    if (resetTimer.current) window.clearTimeout(resetTimer.current);
    resetTimer.current = window.setTimeout(() => setClicks(0), 1500);

    if (next >= EASTER_EGG_CLICKS) {
      setUnlocked(true);
      playSound("success");
    }
  };

  return (
    <div className="relative flex h-full flex-col items-center justify-center gap-5 bg-surface-solid px-8 py-10 text-center">
      <span className="cattipu-screw" style={{ top: 10, left: 10 }} aria-hidden />
      <span className="cattipu-screw" style={{ top: 10, right: 10 }} aria-hidden />
      <span className="cattipu-screw" style={{ bottom: 10, left: 10 }} aria-hidden />
      <span className="cattipu-screw" style={{ bottom: 10, right: 10 }} aria-hidden />
      <motion.button
        onClick={onThumbClick}
        whileTap={{ scale: 0.9, rotate: -4 }}
        whileHover={{ scale: 1.04 }}
        transition={{ type: "spring", stiffness: 420, damping: 16 }}
        className="cattipu-cursor-hand rounded-xl"
        aria-label="CATTIPU logo — click 5 times"
      >
        <PixelLogo mode="retro" variant="icon" className="h-32 w-auto drop-shadow-[0_10px_0_rgba(11,61,145,0.12)]" />
      </motion.button>

      <div>
        <p className="font-pixel-ui text-[0.75rem] tracking-wide text-navy">CATTIPU OS</p>
        <p className="mt-2 text-sm text-ink-dim">
          v{CATTIPU_VERSION} · build {CATTIPU_BUILD}
        </p>
        <p className="mt-3 text-sm italic text-ink">{CATTIPU_TAGLINE}</p>
      </div>

      {!unlocked && clicks > 0 && (
        <p className="text-[11px] text-ink-faint">
          {EASTER_EGG_CLICKS - clicks} more click{EASTER_EGG_CLICKS - clicks === 1 ? "" : "s"}…
        </p>
      )}

      <AnimatePresence>
        {unlocked && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: "spring", stiffness: 340, damping: 22 }}
            className="rounded-lg border-2 border-navy bg-gold/20 px-4 py-2.5"
          >
            <p className="font-pixel-ui text-[0.55rem] tracking-wide text-navy">
              ★ DEVELOPER MODE UNLOCKED ★
            </p>
            <p className="mt-1 text-[11px] text-ink-dim">
              You found the thumb. Nothing else changes — we just like that you looked.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
