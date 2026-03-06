import { create } from "zustand";

type SceneObjectStatus = "pending" | "generating" | "complete" | "failed";

type GenerationState = {
  isGenerating: boolean;
  prompt: string | null;
  progress: number;
  startedAt: number | null;

  // Scene generation tracking
  sceneObjects: Array<{ name: string; status: SceneObjectStatus }>;

  setGenerating: (prompt: string) => void;
  setProgress: (progress: number) => void;
  clearGeneration: () => void;
  setSceneObjects: (objects: Array<{ name: string; status: SceneObjectStatus }>) => void;
  updateSceneObjectStatus: (index: number, status: SceneObjectStatus) => void;
};

export const useGenerationStore = create<GenerationState>((set) => ({
  isGenerating: false,
  prompt: null,
  progress: 0,
  startedAt: null,
  sceneObjects: [],

  setGenerating: (prompt) =>
    set({ isGenerating: true, prompt, progress: 0, startedAt: Date.now() }),
  setProgress: (progress) => set({ progress }),
  clearGeneration: () =>
    set({ isGenerating: false, prompt: null, progress: 0, startedAt: null, sceneObjects: [] }),
  setSceneObjects: (objects) => set({ sceneObjects: objects }),
  updateSceneObjectStatus: (index, status) =>
    set((state) => {
      const updated = [...state.sceneObjects];
      if (updated[index]) updated[index] = { ...updated[index], status };
      return { sceneObjects: updated };
    }),
}));
