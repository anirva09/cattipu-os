"use client";

import { useState } from "react";
import Image from "next/image";
import { Palette, LayoutGrid, MousePointer2, Volume2, Info, Check } from "lucide-react";
import {
  useSettingsStore,
  DOCK_ICON_SIZE_PX,
  type WallpaperVariant,
  type DockMode,
  type DockIconSize,
} from "@/store/useSettingsStore";
import { PixelLogo } from "../Boot/PixelLogo";
import { CATTIPU_VERSION, CATTIPU_BUILD, CATTIPU_TAGLINE } from "@/lib/version";

type Section = "appearance" | "dock" | "cursor" | "sound" | "about";

const SECTIONS: {
  id: Section;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}[] = [
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "dock", label: "Dock", icon: LayoutGrid },
  { id: "cursor", label: "Cursor", icon: MousePointer2 },
  { id: "sound", label: "Sound", icon: Volume2 },
  { id: "about", label: "About", icon: Info },
];

const WALLPAPERS: { id: WallpaperVariant; label: string; swatch: string }[] = [
  {
    id: "paper-grain",
    label: "Paper Grain",
    swatch: "radial-gradient(rgba(11,61,145,0.4) 1px, #ede4c7 1px)",
  },
  {
    id: "blueprint-grid",
    label: "Blueprint Grid",
    swatch:
      "linear-gradient(#0b3d9130 1px, transparent 1px), linear-gradient(90deg, #0b3d9130 1px, #ede4c7 1px)",
  },
  {
    id: "sunrise-geometry",
    label: "Sunrise Geometry",
    swatch:
      "repeating-linear-gradient(45deg, #d6403a26 0px, #d6403a26 4px, transparent 4px, transparent 8px), repeating-linear-gradient(-45deg, #0b3d9120 0px, #0b3d9120 4px, transparent 4px, transparent 8px)",
  },
];

export function SettingsApp() {
  const [section, setSection] = useState<Section>("appearance");

  return (
    <div className="flex h-full bg-surface-solid">
      <nav className="flex w-40 shrink-0 flex-col gap-0.5 border-r border-border bg-surface px-2 py-3">
        {SECTIONS.map((s) => {
          const Icon = s.icon;
          const active = s.id === section;
          return (
            <button
              key={s.id}
              onClick={() => setSection(s.id)}
              className={[
                "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[13px] font-medium transition-colors",
                active ? "bg-navy text-white" : "text-ink hover:bg-navy/[0.06]",
              ].join(" ")}
            >
              <Icon className="h-4 w-4 shrink-0" strokeWidth={2} />
              {s.label}
            </button>
          );
        })}
      </nav>

      <div className="min-w-0 flex-1 overflow-auto px-6 py-5">
        {section === "appearance" && <AppearanceSection />}
        {section === "dock" && <DockSection />}
        {section === "cursor" && <CursorSection />}
        {section === "sound" && <SoundSection />}
        {section === "about" && <AboutSection />}
      </div>
    </div>
  );
}

function SectionTitle({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="mb-5">
      <h2 className="text-base font-semibold text-ink">{title}</h2>
      <p className="text-sm text-ink-dim">{sub}</p>
    </div>
  );
}

function AppearanceSection() {
  const wallpaper = useSettingsStore((s) => s.wallpaper);
  const setWallpaper = useSettingsStore((s) => s.setWallpaper);

  return (
    <div>
      <SectionTitle title="Appearance" sub="Choose the desktop's mood." />
      <div className="grid grid-cols-3 gap-3">
        {WALLPAPERS.map((w) => {
          const active = w.id === wallpaper;
          return (
            <button
              key={w.id}
              onClick={() => setWallpaper(w.id)}
              className={[
                "group flex flex-col items-center gap-2 rounded-lg border-2 p-2 transition-colors",
                active ? "border-navy" : "border-border hover:border-border-strong",
              ].join(" ")}
            >
              <div
                className="relative h-16 w-full overflow-hidden rounded-md border border-black/10"
                style={{ backgroundImage: w.swatch, backgroundColor: "#ede4c7", backgroundSize: "10px 10px" }}
              >
                {active && (
                  <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-navy text-white">
                    <Check className="h-2.5 w-2.5" strokeWidth={3} />
                  </span>
                )}
              </div>
              <span className="text-[12px] font-medium text-ink">{w.label}</span>
            </button>
          );
        })}
      </div>
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

      <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-ink-faint">
        Behavior
      </p>
      <div className="mb-6 flex gap-2">
        {(["hover", "always"] as DockMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => setDockMode(mode)}
            className={[
              "rounded-md border px-3 py-1.5 text-[13px] font-medium transition-colors",
              dockMode === mode
                ? "border-navy bg-navy text-white"
                : "border-border-strong text-ink hover:bg-navy/[0.06]",
            ].join(" ")}
          >
            {mode === "hover" ? "Hover to expand" : "Always expanded"}
          </button>
        ))}
      </div>

      <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-ink-faint">
        Icon size
      </p>
      <div className="flex gap-2">
        {(["sm", "md", "lg"] as DockIconSize[]).map((size) => (
          <button
            key={size}
            onClick={() => setDockIconSize(size)}
            className={[
              "flex h-11 w-11 items-center justify-center rounded-md border transition-colors",
              dockIconSize === size
                ? "border-navy bg-navy/10"
                : "border-border-strong hover:bg-navy/[0.06]",
            ].join(" ")}
            title={size.toUpperCase()}
          >
            <span
              className="rounded-sm bg-navy"
              style={{ width: DOCK_ICON_SIZE_PX[size] * 0.5, height: DOCK_ICON_SIZE_PX[size] * 0.5 }}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

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
      <div className="mt-5 flex items-center gap-4 rounded-lg border border-border bg-surface px-4 py-3">
        {["arrow", "hand", "text", "resize"].map((c) => (
          <div key={c} className="flex flex-col items-center gap-1.5">
            <Image
              src={`/cursors/${c}.png`}
              alt={c}
              width={64}
              height={64}
              className="pixelated h-8 w-8"
            />
            <span className="text-[11px] capitalize text-ink-dim">{c}</span>
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
      <div className="mt-5">
        <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-ink-faint">
          Volume
        </p>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={soundVolume}
          disabled={!soundEnabled}
          onChange={(e) => setSoundVolume(Number(e.target.value))}
          className="w-full accent-navy disabled:opacity-40"
        />
      </div>
    </div>
  );
}

function AboutSection() {
  return (
    <div>
      <SectionTitle title="About" sub="This copy of CATTIPU OS." />
      <div className="flex items-center gap-4 rounded-lg border border-border bg-surface px-4 py-4">
        <PixelLogo mode="retro" variant="mark" className="h-10 w-auto" />
        <div>
          <p className="text-sm font-semibold text-ink">CATTIPU OS</p>
          <p className="text-xs text-ink-dim">
            v{CATTIPU_VERSION} · build {CATTIPU_BUILD}
          </p>
          <p className="mt-1 text-xs italic text-ink-faint">{CATTIPU_TAGLINE}</p>
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
    <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-surface px-4 py-3">
      <div>
        <p className="text-[13px] font-medium text-ink">{label}</p>
        <p className="text-xs text-ink-dim">{description}</p>
      </div>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={[
          "relative h-6 w-11 shrink-0 rounded-full border transition-colors",
          checked ? "border-navy bg-navy" : "border-border-strong bg-bg-dim",
        ].join(" ")}
      >
        <span
          className={[
            "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform",
            checked ? "translate-x-[22px]" : "translate-x-0.5",
          ].join(" ")}
        />
      </button>
    </div>
  );
}
