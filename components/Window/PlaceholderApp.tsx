"use client";

import type { AppDef } from "@/lib/apps";
import { isShellIconName, ShellIcon } from "@/components/PixelIcon";

import "../../design-system/bevel.css";
import "./PlaceholderApp.css";

/**
 * The window an app opens into before it ships. Same material and type as
 * the rest of the shell: the app's own PixelForge mark at its native 32px in
 * a raised plate, body-role text, a square status plate. No entrance
 * animation — the window itself already arrives mechanically.
 */
export function PlaceholderApp({ app }: { app: AppDef }) {
  return (
    <div className="cattipu-placeholder-app">
      <span className="cattipu-placeholder-app__mark cattipu-edge--outer cattipu-bevel--raised">
        {isShellIconName(app.icon) ? <ShellIcon name={app.icon} size={32} /> : null}
      </span>
      <h2 className="cattipu-placeholder-app__title">{app.label}</h2>
      <p className="cattipu-placeholder-app__tagline">{app.tagline}</p>
      <span className="cattipu-placeholder-app__status cattipu-edge--outer cattipu-bevel--inset">
        On the CATTIPU OS roadmap — not in v0.1
      </span>
    </div>
  );
}
