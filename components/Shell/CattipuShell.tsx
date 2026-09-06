"use client";

import { useEffect, useMemo, useState } from "react";

import { InteractiveDesktop } from "@/components/InteractiveDesktop";
import type { CattipuSidebarIcons } from "@/components/Sidebar/Sidebar";
import { CATTIPU_SIDEBAR_ITEMS } from "@/components/Sidebar/Sidebar";
import { AppIcon } from "@/components/Icons";
import { PixelLogo } from "@/components/Boot/PixelLogo";

/**
 * The seam between this repository and the frozen v0.9 package.
 *
 * `InteractiveDesktop` is a locked visual component: it asks for a brand
 * mark, a sidebar icon per item, and a preformatted date string, and it
 * owns everything below that. Everything repo-specific — which icon set
 * feeds the rail, how the clock is formatted — lives here instead of in
 * the package, so the package stays byte-identical to what was signed off
 * and this file is the only place integration decisions are recorded.
 */

/** The nine rail items the package's Sidebar declares. Every one maps to an
 *  id the repo's own APP_ICONS set already draws, so the rail needs no new
 *  artwork — see components/Icons/appIcons.ts. */
const SIDEBAR_ICON_SIZE = 32;

function useDateTimeText(): string {
  // Rendered empty on the server and filled on the client. A date formatted
  // during SSR is a guaranteed hydration mismatch — the server's clock and
  // timezone are not the viewer's — and the top bar would flash the wrong
  // time before correcting itself.
  const [text, setText] = useState("");

  useEffect(() => {
    const format = () =>
      new Intl.DateTimeFormat(undefined, {
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }).format(new Date());

    setText(format());
    const id = window.setInterval(() => setText(format()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  return text;
}

export function CattipuShell() {
  const dateTimeText = useDateTimeText();

  const sidebarIcons = useMemo<CattipuSidebarIcons>(() => {
    const entries = CATTIPU_SIDEBAR_ITEMS.map(({ id, label }) => [
      id,
      <AppIcon
        key={id}
        icon={id}
        alt={label}
        style={{ width: SIDEBAR_ICON_SIZE, height: SIDEBAR_ICON_SIZE }}
      />,
    ]);
    return Object.fromEntries(entries) as CattipuSidebarIcons;
  }, []);

  return (
    <InteractiveDesktop
      brandMark={<PixelLogo variant="topbar" className="h-9 w-9" />}
      sidebarIcons={sidebarIcons}
      dateTimeText={dateTimeText}
    />
  );
}
