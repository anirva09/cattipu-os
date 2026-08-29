"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { PixelLogo } from "./PixelLogo";
import { useBootStore } from "@/store/useBootStore";
import { useUiSound } from "@/lib/useUiSound";

// segmented loading bar: 5 color groups x 4 segments, filling left to right
const SEGMENT_COLORS = ["var(--color-red)", "var(--color-green)", "var(--color-blue)", "var(--color-gold)", "var(--color-purple)"];
const SEGMENTS_PER_COLOR = 4;
const TOTAL_SEGMENTS = SEGMENT_COLORS.length * SEGMENTS_PER_COLOR;

const START_DELAY = 500; // ms before the bar starts filling
const BAR_DURATION = 2200; // ms to fill all segments
const HOLD_AFTER = 500; // ms to hold at 100% before exit
const EXIT_DELAY = START_DELAY + BAR_DURATION + HOLD_AFTER;

export function BootScreen() {
  const complete = useBootStore((s) => s.complete);
  const [filled, setFilled] = useState(0);
  const [exiting, setExiting] = useState(false);
  const playSound = useUiSound();

  const skip = useMemo(
    () => () => {
      setExiting(true);
      window.setTimeout(complete, 500);
    },
    [complete]
  );

  useEffect(() => {
    const timers: number[] = [];
    const stepDuration = BAR_DURATION / TOTAL_SEGMENTS;

    timers.push(window.setTimeout(() => playSound("boot"), START_DELAY));

    for (let i = 1; i <= TOTAL_SEGMENTS; i++) {
      timers.push(
        window.setTimeout(() => setFilled(i), START_DELAY + i * stepDuration)
      );
    }
    timers.push(window.setTimeout(skip, EXIT_DELAY));

    const onKey = () => skip();
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onKey);

    return () => {
      timers.forEach((t) => window.clearTimeout(t));
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const done = filled >= TOTAL_SEGMENTS;
  // Milestone 12 (Constitutional Foundation Retrofit) — "normalize
  // machine/system language... INITIALIZING..., LOADING MODULES...,
  // READY." Copy/system-language alignment only: the segmented bar,
  // timing, and every other beat of this screen are untouched — only the
  // single pre-READY label now stages through the two frozen boot phrases
  // instead of a single static "BOOTING CATTIPU OS" the whole time.
  const stage = done ? "READY" : filled / TOTAL_SEGMENTS < 0.5 ? "INITIALIZING" : "LOADING MODULES";

  return (
    <AnimatePresence>
      {!exiting && (
        <motion.div
          key="boot"
          className="fixed inset-0 z-50 flex items-center justify-center bg-bg"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{
            opacity: 0,
            scale: 1.06,
            filter: "blur(6px)",
            transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] },
          }}
          transition={{ duration: 0.4 }}
        >
          {/* faint scanline / crt texture for retro feel */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.05]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(0deg, #0b3d91 0px, #0b3d91 1px, transparent 1px, transparent 3px)",
            }}
          />

          <div className="flex w-[min(90vw,26rem)] flex-col items-center gap-8">
            <motion.div
              initial={{ scale: 0.55, opacity: 0, y: -8 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 18, delay: 0.15 }}
              className="drop-shadow-[0_8px_0_rgba(11,61,145,0.15)]"
            >
              <PixelLogo mode="retro" variant="lockup" className="w-[13.5rem] h-auto" priority />
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.4 }}
              className="font-hero text-[0.6rem] tracking-[0.15em] text-navy"
            >
              . . . {stage} . . .
            </motion.p>

            <div className="flex w-full gap-[3px] rounded-sm border-2 border-black bg-surface p-[3px]">
              {Array.from({ length: TOTAL_SEGMENTS }).map((_, i) => (
                <div
                  key={i}
                  className="h-3.5 flex-1 transition-colors duration-150"
                  style={{
                    backgroundColor:
                      i < filled ? SEGMENT_COLORS[Math.floor(i / SEGMENTS_PER_COLOR)] : "transparent",
                  }}
                />
              ))}
            </div>

            <motion.button
              onClick={skip}
              initial={{ opacity: 0 }}
              animate={{ opacity: done ? 1 : 0 }}
              transition={{ duration: 0.4 }}
              className="font-pixel-ui text-[0.45rem] text-ink-dim hover:text-navy transition-colors"
            >
              PRESS ANY KEY TO CONTINUE
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
