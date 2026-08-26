"use client";

import { useSettingsStore } from "@/store/useSettingsStore";

/**
 * The living OS backdrop. Three official wallpapers, switchable from
 * Settings > Appearance — all share the same flat warm cream base and the
 * same subtle paper-grain texture on top, so switching never looks like a
 * different app, just a different mood:
 *
 *  - paper-grain (default) -> textured stationery: a fine dot weave that
 *    reads as pressed paper, nothing more.
 *  - blueprint-grid -> a fine navy grid, evenly lit — engineering paper.
 *  - sunrise-geometry -> hard-edged geometric shapes only (concentric ring
 *    "sun" motif + a crosshatch diamond field), no soft/smooth gradients —
 *    warm, retro, optical-art rather than a color wash.
 */
export function Wallpaper() {
  const variant = useSettingsStore((s) => s.wallpaper);

  return (
    <div className="absolute inset-0 overflow-hidden bg-bg">
      {variant === "paper-grain" && (
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(rgba(11,61,145,0.3) 0.6px, transparent 0.6px)",
            backgroundSize: "6px 6px",
            maskImage:
              "radial-gradient(circle at 50% 38%, black 0%, black 45%, transparent 100%)",
            WebkitMaskImage:
              "radial-gradient(circle at 50% 38%, black 0%, black 45%, transparent 100%)",
            opacity: 0.45,
          }}
        />
      )}

      {variant === "blueprint-grid" && (
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(rgba(11,61,145,0.14) 1px, transparent 1px), linear-gradient(90deg, rgba(11,61,145,0.14) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
            maskImage:
              "radial-gradient(circle at 50% 40%, black 0%, black 55%, transparent 100%)",
            WebkitMaskImage:
              "radial-gradient(circle at 50% 40%, black 0%, black 55%, transparent 100%)",
          }}
        />
      )}

      {variant === "sunrise-geometry" && (
        <>
          {/* concentric hard-edged rings — a geometric "sun", not a gradient glow */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "repeating-radial-gradient(circle at 78% 16%, rgba(240,196,25,0.28) 0px, rgba(240,196,25,0.28) 3px, transparent 3px, transparent 9px)",
            }}
          />
          {/* crosshatch diamond field — hard stops only, no blending */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "repeating-linear-gradient(45deg, rgba(214,64,58,0.08) 0px, rgba(214,64,58,0.08) 8px, transparent 8px, transparent 16px), repeating-linear-gradient(-45deg, rgba(11,61,145,0.06) 0px, rgba(11,61,145,0.06) 8px, transparent 8px, transparent 16px)",
              maskImage:
                "linear-gradient(to bottom, transparent 0%, black 35%, black 100%)",
              WebkitMaskImage:
                "linear-gradient(to bottom, transparent 0%, black 35%, black 100%)",
            }}
          />
        </>
      )}

      {/* shared paper grain, every variant */}
      <div
        className="absolute inset-0 opacity-[0.35] mix-blend-multiply"
        style={{
          backgroundImage: "url(/textures/paper-grain.png)",
          backgroundRepeat: "repeat",
          backgroundSize: "128px 128px",
        }}
        aria-hidden
      />
    </div>
  );
}
