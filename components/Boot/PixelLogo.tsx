"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * The CATTIPU mark. Backed by the real brand asset (public/logo/*):
 * a pixel-art thumbs-up with the CATTIPU wordmark set inside it.
 *
 *  - mode="retro"  -> full retro palette (cream-boot usage)
 *  - mode="mono"   -> single-color (white / navy) cutout, for OS chrome
 *  - variant="lockup" -> icon + "CATTIPU OS" wordmark + color bar (boot hero)
 *  - variant="icon"   -> just the thumb + lettering, legible from ~40px up
 *    (dock icons, larger placements)
 *  - variant="mark"   -> the thumb reduced to a solid silhouette, no interior
 *    lettering — the CATTIPU wordmark turns to mush under ~32px, so anything
 *    smaller (favicon, tiny badges) uses this instead
 *  - variant="topbar" -> colorful icon with a white halo outline, for sitting
 *    directly on the navy top bar (colorful mark reads there; a navy-outlined
 *    one would vanish into the navy background)
 */

type Mode = "retro" | "mono";
type Variant = "icon" | "lockup" | "mark" | "topbar";

const SOURCES: Record<Mode, Record<Variant, { src: string; width: number; height: number }>> = {
  retro: {
    icon: { src: "/logo/icon-color.png", width: 480, height: 499 },
    lockup: { src: "/logo/boot-lockup.png", width: 720, height: 800 },
    mark: { src: "/logo/mark-navy.png", width: 256, height: 266 },
    topbar: { src: "/logo/icon-haloed.png", width: 160, height: 166 },
  },
  mono: {
    icon: { src: "/logo/icon-mono.png", width: 128, height: 133 },
    lockup: { src: "/logo/lockup-mono.png", width: 720, height: 800 },
    mark: { src: "/logo/mark-white.png", width: 256, height: 266 },
    topbar: { src: "/logo/icon-haloed.png", width: 160, height: 166 },
  },
};

interface PixelLogoProps {
  mode?: Mode;
  variant?: Variant;
  className?: string;
  title?: string;
  priority?: boolean;
}

export function PixelLogo({
  mode = "retro",
  variant = "icon",
  className,
  title = "CATTIPU OS",
  priority,
}: PixelLogoProps) {
  const meta = SOURCES[mode][variant];

  return (
    <Image
      src={meta.src}
      width={meta.width}
      height={meta.height}
      alt={title}
      draggable={false}
      priority={priority}
      className={cn("pixelated select-none", className)}
    />
  );
}
