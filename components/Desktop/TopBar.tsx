"use client";

import { useEffect, useState } from "react";
import { Sun, Volume2 } from "lucide-react";
import { PixelLogo } from "../Boot/PixelLogo";

export function TopBar() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 1000 * 15);
    return () => window.clearInterval(id);
  }, []);

  const time = now
    ? now.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
    : "";
  const date = now
    ? now.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })
    : "";

  return (
    <div className="cattipu-raised-navy relative z-30 flex h-11 shrink-0 items-center justify-between bg-navy px-3 text-white">
      <div className="flex items-center gap-2.5">
        <span className="cattipu-badge flex h-8 w-8 shrink-0 items-center justify-center">
          <PixelLogo mode="retro" variant="topbar" className="h-6 w-auto" />
        </span>
        <span className="cattipu-emboss-text-inverted font-pixel-ui text-[0.6rem] tracking-[0.1em]">
          CATTIPU OS
        </span>
      </div>

      <div className="cattipu-recessed-navy flex items-center gap-4 px-3 py-1.5 text-[13px] text-white/85">
        <Sun className="h-3.5 w-3.5 text-white/60" strokeWidth={2.5} />
        <span className="cattipu-emboss-text-inverted">{date}</span>
        <span className="cattipu-emboss-text-inverted tabular-nums text-white">{time}</span>
        <span className="h-3 w-px bg-white/15" aria-hidden />
        <Volume2 className="h-3.5 w-3.5 text-white/60" strokeWidth={2.5} />
      </div>
    </div>
  );
}
