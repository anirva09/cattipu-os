"use client";

/**
 * System sounds. Subtle, <1s, chiptune-style WAVs at public/sounds/.
 * Gated by useSettingsStore (enabled + volume) — always check settings
 * before calling play(), since this module has no store access itself
 * (kept dependency-free so it can be imported from anywhere, including
 * the boot screen which mounts before the rest of the shell).
 */

export type SoundName = "boot" | "window-open" | "window-close" | "success" | "error";

const cache: Partial<Record<SoundName, HTMLAudioElement>> = {};

function getAudio(name: SoundName): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  if (!cache[name]) {
    const el = new Audio(`/sounds/${name}.wav`);
    el.preload = "auto";
    cache[name] = el;
  }
  return cache[name] ?? null;
}

export function playSound(name: SoundName, volume: number) {
  const el = getAudio(name);
  if (!el) return;
  try {
    el.currentTime = 0;
    el.volume = Math.min(1, Math.max(0, volume));
    void el.play()?.catch(() => {
      /* autoplay can be blocked before any user gesture — ignore */
    });
  } catch {
    /* ignore playback errors */
  }
}
