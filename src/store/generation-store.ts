import { create } from "zustand";

type GenerationState = {
  isGenerating: boolean;
  prompt: string | null;
  progress: number;
  startedAt: number | null;
  setGenerating: (prompt: string) => void;
  setProgress: (progress: number) => void;
  clearGeneration: () => void;
};

export const useGenerationStore = create<GenerationState>((set) => ({
  isGenerating: false,
  prompt: null,
  progress: 0,
  startedAt: null,
  setGenerating: (prompt) =>
    set({ isGenerating: true, prompt, progress: 0, startedAt: Date.now() }),
  setProgress: (progress) => set({ progress }),
  clearGeneration: () =>
    set({ isGenerating: false, prompt: null, progress: 0, startedAt: null }),
}));
