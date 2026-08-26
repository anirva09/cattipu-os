"use client";

import { motion } from "framer-motion";

/**
 * The OS-wide loading indicator: four small pixel squares in the thumb's
 * own palette (gold / red / blue / green), bouncing in a fixed mechanical
 * sequence — no rotation, no smooth easing, nothing that reads as a
 * generic spinner. This is what "CATTIPU is thinking" should look like
 * everywhere in the shell, not a borrowed system glyph.
 */
const DOT_COLORS = [
  "var(--color-gold)",
  "var(--color-red)",
  "var(--color-blue)",
  "var(--color-green)",
];

interface CattipuSpinnerProps {
  size?: number;
  className?: string;
}

export function CattipuSpinner({ size = 5, className }: CattipuSpinnerProps) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={["inline-flex items-end gap-[3px]", className].filter(Boolean).join(" ")}
    >
      {DOT_COLORS.map((color, i) => (
        <motion.span
          key={color}
          className="block rounded-[1px]"
          style={{ width: size, height: size, background: color }}
          animate={{ y: [0, -size * 0.7, 0] }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            ease: "linear",
            delay: i * 0.12,
          }}
        />
      ))}
    </span>
  );
}
