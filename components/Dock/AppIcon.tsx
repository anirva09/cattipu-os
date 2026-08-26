"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

// intrinsic dims of each cropped icon asset (public/icons/*.png)
const DIMS: Record<string, { width: number; height: number }> = {
  home: { width: 54, height: 54 },
  projects: { width: 59, height: 51 },
  architect: { width: 53, height: 54 },
  canvas: { width: 52, height: 53 },
  forge: { width: 55, height: 43 },
  launch: { width: 52, height: 49 },
  memory: { width: 51, height: 56 },
  settings: { width: 54, height: 56 },
  explorer: { width: 66, height: 57 },
  archive: { width: 66, height: 54 },
};

interface AppIconProps {
  icon: string;
  className?: string;
  alt?: string;
  style?: React.CSSProperties;
}

export function AppIcon({ icon, className, alt, style }: AppIconProps) {
  const dims = DIMS[icon] ?? { width: 54, height: 54 };
  return (
    <Image
      src={`/icons/${icon}.png`}
      width={dims.width}
      height={dims.height}
      alt={alt ?? icon}
      draggable={false}
      style={style}
      className={cn("pixelated select-none", className)}
    />
  );
}
