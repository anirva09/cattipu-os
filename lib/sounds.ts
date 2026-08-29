"use client";

/**
 * System sounds. Subtle, <1s, chiptune-style WAVs at public/sounds/.
 * Gated by useSettingsStore (enabled + volume) — always check settings
 * before calling play(), since this module has no store access itself
 * (kept dependency-free so it can be imported from anywhere, including
 * the boot screen which mounts before the rest of the shell).
 *
 * Milestone 12 (Constitutional Foundation Retrofit) — "audit, do not
 * redesign, the existing sound system. Map the sound vocabulary clearly
 * to: mechanical click, soft chime, relay launch, short buzzer." Audited
 * scripts/gen_sounds.py (the source of every WAV below) against that
 * four-word vocabulary; every existing asset already satisfies it, so
 * nothing was regenerated — this is the frozen mapping:
 *
 *   window-open / window-close  -> mechanical click   (quick tri-wave blip, ~0.12s)
 *   success                     -> soft chime          (bright two-note major third, ~0.2s)
 *   boot                        -> relay launch        (three-note rising square-wave fanfare, ~0.55s)
 *   error                       -> short buzzer        (low two-note descending square wave, ~0.22s)
 *
 * All four are short (<1s), restrained (0.15-0.22 peak volume in
 * gen_sounds.py), and synthesized tones rather than samples of any real
 * historical OS chime — "do not copy recognizable historical operating-
 * system sounds" was already true before this pass. "Sound-off setting
 * suppresses optional sound" is already enforced by every caller: see
 * useUiSound() below and store/useWindowStore.ts's own chime() helper,
 * both of which check useSettingsStore's soundEnabled before playing
 * anything — confirmed here, not changed.
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
