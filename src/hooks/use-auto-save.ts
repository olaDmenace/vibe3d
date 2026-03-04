import { useEffect, useRef, useCallback } from "react";
import { useEditorStore } from "@/store/editor-store";

const AUTO_SAVE_INTERVAL = 30_000; // 30 seconds

export function useAutoSave(projectId: string | null) {
  const lastSavedRef = useRef<string>("");
  const savingRef = useRef(false);

  const save = useCallback(async () => {
    if (!projectId || savingRef.current) return;

    const sceneState = useEditorStore.getState().getSerializableState();
    const serialized = JSON.stringify(sceneState);

    // Skip if nothing changed since last save
    if (serialized === lastSavedRef.current) return;

    savingRef.current = true;
    useEditorStore.setState({ isSaving: true });
    try {
      const res = await fetch(`/api/projects/${projectId}/scene`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scene_graph: sceneState }),
      });
      if (res.ok) {
        lastSavedRef.current = serialized;
        useEditorStore.setState({ isDirty: false, isSaving: false, lastSavedAt: Date.now() });
      } else {
        useEditorStore.setState({ isSaving: false });
      }
    } catch {
      useEditorStore.setState({ isSaving: false });
    } finally {
      savingRef.current = false;
    }
  }, [projectId]);

  // Periodic auto-save
  useEffect(() => {
    if (!projectId) return;

    const interval = setInterval(save, AUTO_SAVE_INTERVAL);
    return () => clearInterval(interval);
  }, [projectId, save]);

  // Save on page blur (tab switch / window minimize)
  useEffect(() => {
    if (!projectId) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        save();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [projectId, save]);

  // Save on Ctrl+S (custom event from keyboard shortcuts)
  useEffect(() => {
    if (!projectId) return;

    const handleManualSave = () => save();
    window.addEventListener("editor:save", handleManualSave);
    return () => window.removeEventListener("editor:save", handleManualSave);
  }, [projectId, save]);

  // Save on beforeunload
  useEffect(() => {
    if (!projectId) return;

    const handleBeforeUnload = () => {
      const sceneState = useEditorStore.getState().getSerializableState();
      const serialized = JSON.stringify(sceneState);
      if (serialized !== lastSavedRef.current) {
        // Use sendBeacon for reliable delivery during unload
        navigator.sendBeacon(
          `/api/projects/${projectId}/scene`,
          new Blob(
            [JSON.stringify({ scene_graph: sceneState })],
            { type: "application/json" }
          )
        );
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [projectId]);

  // Update the lastSaved ref when a scene is first loaded
  const markClean = useCallback((sceneState: unknown) => {
    lastSavedRef.current = JSON.stringify(sceneState);
    useEditorStore.setState({ isDirty: false, lastSavedAt: Date.now() });
  }, []);

  return { save, markClean };
}
