"use client";

import { useState } from "react";
import Image from "next/image";
import { ShellIcon, type ShellIconName } from "@/components/PixelIcon";
import {
  useSettingsStore,
  DOCK_ICON_SIZE_PX,
  type DockMode,
  type DockIconSize,
} from "@/store/useSettingsStore";
import { useNotificationStore } from "@/store/useNotificationStore";
import { PixelLogo } from "../Boot/PixelLogo";
import { CATTIPU_VERSION, CATTIPU_BUILD, CATTIPU_TAGLINE } from "@/lib/version";
import { DeveloperDiagnostics } from "@/components/Diagnostics/DeveloperDiagnostics";
import { WallpaperStudio } from "@/components/WallpaperStudio/WallpaperStudio";

import "../../design-system/bevel.css";
import "./SettingsApp.css";

/** A raised physical key: the shell's bevel primitives, square corners. */
const KEY = "cattipu-edge--outer cattipu-bevel--raised cattipu-bevel--pressable";
/** A sunk instrument well. */
const WELL = "cattipu-edge--outer cattipu-bevel--inset";

type Section =
  | "wallpaper"
  | "dock"
  | "cursor"
  | "sound"
  | "notifications"
  | "diagnostics"
  | "about";

// Every section is marked with its own hand-drawn 16×16 PixelForge mark
// (components/PixelIcon/shellIcons.ts), rendered at native size in the
// 24px icon column. No lucide glyphs, and no mark borrowed from an
// unrelated app: Wallpaper is a framed picture, not Canvas; Diagnostics is
// an instrument, not the terminal. Notifications reuses the top bar's bell.
const SECTIONS: { id: Section; label: string; icon: ShellIconName }[] = [
  { id: "wallpaper", label: "Wallpaper", icon: "wallpaper" },
  { id: "dock", label: "Dock", icon: "dock" },
  { id: "cursor", label: "Cursor", icon: "cursor" },
  { id: "sound", label: "Sound", icon: "sound" },
  // Milestone 12 (Constitutional Foundation Retrofit) — "provide one safe
  // verification path so the [notification] primitive can be tested."
  { id: "notifications", label: "Notifications", icon: "bell" },
  { id: "diagnostics", label: "Diagnostics", icon: "diagnostics" },
  { id: "about", label: "About", icon: "about" },
];

export function SettingsApp() {
  const [section, setSection] = useState<Section>("wallpaper");

  return (
    <div className="cattipu-settings">
      <nav className="cattipu-settings__nav" aria-label="Settings sections">
        {SECTIONS.map((s) => {
          const active = s.id === section;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setSection(s.id)}
              aria-current={active ? "page" : undefined}
              className="cattipu-settings__nav-item"
            >
              <span className="cattipu-settings__nav-icon" aria-hidden="true">
                <ShellIcon name={s.icon} size={16} />
              </span>
              <span className="cattipu-settings__nav-label">{s.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="cattipu-settings__content">
        {section === "wallpaper" && <WallpaperStudio />}
        {section === "dock" && <DockSection />}
        {section === "cursor" && <CursorSection />}
        {section === "sound" && <SoundSection />}
        {section === "notifications" && <NotificationsSection />}
        {section === "diagnostics" && <DeveloperDiagnostics />}
        {section === "about" && <AboutSection />}
      </div>
    </div>
  );
}

function SectionTitle({ title, sub }: { title: string; sub: string }) {
  return (
    <div>
      <h2 className="cattipu-settings__title">{title}</h2>
      <p className="cattipu-settings__sub">{sub}</p>
    </div>
  );
}

function DockSection() {
  const dockMode = useSettingsStore((s) => s.dockMode);
  const setDockMode = useSettingsStore((s) => s.setDockMode);
  const dockIconSize = useSettingsStore((s) => s.dockIconSize);
  const setDockIconSize = useSettingsStore((s) => s.setDockIconSize);

  return (
    <div>
      <SectionTitle title="Dock" sub="How the icon rail behaves." />

      <p className="cattipu-settings__group-label">Behavior</p>
      <div className="cattipu-settings__row">
        {(["hover", "always"] as DockMode[]).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => setDockMode(mode)}
            aria-pressed={dockMode === mode}
            className={`cattipu-settings__button ${KEY}`}
          >
            {mode === "hover" ? "Hover to expand" : "Always expanded"}
          </button>
        ))}
      </div>

      <p className="cattipu-settings__group-label">Icon size</p>
      <div className="cattipu-settings__row">
        {(["sm", "md", "lg"] as DockIconSize[]).map((size) => (
          <button
            key={size}
            type="button"
            onClick={() => setDockIconSize(size)}
            aria-pressed={dockIconSize === size}
            className={`cattipu-settings__size-key ${KEY}`}
            title={size.toUpperCase()}
          >
            <span
              className="cattipu-settings__size-swatch"
              style={{
                width: Math.round(DOCK_ICON_SIZE_PX[size] / 2),
                height: Math.round(DOCK_ICON_SIZE_PX[size] / 2),
              }}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

/** Intrinsic size of each cropped cursor PNG (scripts/gen_cursors.py). */
const CURSOR_PREVIEWS = [
  { id: "arrow", width: 18, height: 28 },
  { id: "hand", width: 32, height: 32 },
  { id: "text", width: 16, height: 28 },
  { id: "resize", width: 28, height: 28 },
] as const;

function CursorSection() {
  const cursorEnabled = useSettingsStore((s) => s.cursorEnabled);
  const setCursorEnabled = useSettingsStore((s) => s.setCursorEnabled);

  return (
    <div>
      <SectionTitle title="Cursor" sub="Crisp pixel cursors, in place of your browser's." />
      <ToggleRow
        label="Pixel cursors"
        description="Arrow, hand, text, and resize glyphs replace the system cursor."
        checked={cursorEnabled}
        onChange={setCursorEnabled}
      />
      <div className={`cattipu-settings__previews ${WELL}`}>
        {CURSOR_PREVIEWS.map((c) => (
          <div key={c.id} className="cattipu-settings__preview">
            {/* M20C1: each cursor PNG is cropped to its own glyph, so the
                sizes differ and a fixed square box would stretch them.
                Every preview renders at its true pixel size, centred in a
                common 32px slot, and `unoptimized` keeps the two-colour
                artwork out of the lossy WebP pipeline. */}
            <span className="cattipu-settings__preview-slot">
              <Image
                src={`/cursors/${c.id}.png`}
                alt={c.id}
                width={c.width}
                height={c.height}
                unoptimized
                className="pixelated"
              />
            </span>
            <span className="cattipu-settings__preview-caption">{c.id}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SoundSection() {
  const soundEnabled = useSettingsStore((s) => s.soundEnabled);
  const setSoundEnabled = useSettingsStore((s) => s.setSoundEnabled);
  const soundVolume = useSettingsStore((s) => s.soundVolume);
  const setSoundVolume = useSettingsStore((s) => s.setSoundVolume);

  return (
    <div>
      <SectionTitle title="Sound" sub="Short, subtle system sounds." />
      <ToggleRow
        label="System sounds"
        description="Boot, window open/close, and success/error chimes."
        checked={soundEnabled}
        onChange={setSoundEnabled}
      />
      <div className="cattipu-settings__note">
        <p className="cattipu-settings__group-label">Volume</p>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={soundVolume}
          disabled={!soundEnabled}
          onChange={(e) => setSoundVolume(Number(e.target.value))}
          className="cattipu-settings__range"
        />
      </div>
    </div>
  );
}

// Milestone 12 (Constitutional Foundation Retrofit) — the notification
// primitive's one safe, discoverable verification path: four buttons,
// one per frozen type, each firing a real sample notification through
// the real store (not a mock) so the actual queue/stack-cap/auto-dismiss/
// sound behavior can be exercised by hand or by Playwright.
const SAMPLE_NOTIFICATIONS: {
  type: "info" | "success" | "warning" | "error";
  label: string;
  iconId: ShellIconName;
  title: string;
  message: string;
}[] = [
  { type: "info", label: "Info", iconId: "info", title: "Project synced", message: "Everything is up to date." },
  {
    type: "success",
    label: "Success",
    iconId: "ready",
    title: "Export complete",
    message: "Your architecture was exported.",
  },
  {
    type: "warning",
    label: "Warning",
    iconId: "warning",
    title: "Unsaved changes",
    message: "Close without saving?",
  },
  {
    type: "error",
    label: "Error",
    iconId: "error",
    title: "Connection lost",
    message: "Could not reach the workspace.",
  },
];

function NotificationsSection() {
  const push = useNotificationStore((s) => s.push);

  return (
    <div>
      <SectionTitle
        title="Notifications"
        sub="Native CATTIPU system notifications — hard-bordered, no modern toast styling."
      />
      <div className="cattipu-settings__grid">
        {SAMPLE_NOTIFICATIONS.map((n) => (
          <button
            key={n.type}
            type="button"
            onClick={() => push(n.type, n.title, { message: n.message })}
            className={`cattipu-cursor-hand cattipu-settings__button ${KEY}`}
          >
            <ShellIcon name={n.iconId} size={16} />
            <span>Send {n.label}</span>
          </button>
        ))}
      </div>
      <p className="cattipu-settings__note">
        Ordinary notifications clear themselves in a few seconds. Errors stay until dismissed.
      </p>
    </div>
  );
}

function AboutSection() {
  return (
    <div>
      <SectionTitle title="About" sub="This copy of CATTIPU OS." />
      <div className={`cattipu-settings__about ${WELL}`}>
        <PixelLogo mode="retro" variant="mark" className="h-10 w-auto" />
        <div>
          <p>CATTIPU OS</p>
          <p className="cattipu-settings__panel-note">
            v{CATTIPU_VERSION} · build {CATTIPU_BUILD}
          </p>
          <p className="cattipu-settings__panel-note">{CATTIPU_TAGLINE}</p>
        </div>
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className={`cattipu-settings__panel ${WELL}`}>
      <div>
        <p className="cattipu-settings__panel-label">{label}</p>
        <p className="cattipu-settings__panel-note">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`cattipu-cursor-hand cattipu-settings__switch ${WELL}`}
      >
        <span className="cattipu-settings__switch-knob cattipu-edge--outer" />
      </button>
    </div>
  );
}
