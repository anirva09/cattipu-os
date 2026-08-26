import { create } from "zustand";

export type BootPhase = "booting" | "booted";

interface BootState {
  phase: BootPhase;
  complete: () => void;
}

export const useBootStore = create<BootState>((set) => ({
  phase: "booting",
  complete: () => set({ phase: "booted" }),
}));
