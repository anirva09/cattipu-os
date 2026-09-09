"use client";

import { useCallback } from "react";
import { useSettingsStore } from "@/store/useSettingsStore";
import { playSound, type SoundName } from "@/lib/sounds";

/** Settings-aware sound trigger — the hook every component should use. */
export function useUiSound() {
  const enabled = useSettingsStore((s) => s.soundEnabled);
  const volume = useSettingsStore((s) => s.soundVolume);

  return useCallback(
    (name: SoundName) => {
      if (!enabled) return;
      playSound(name, volume);
    },
    [enabled, volume]
  );
}
