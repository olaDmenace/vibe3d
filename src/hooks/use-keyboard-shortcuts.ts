"use client";

import { useEditorStore } from "@/store/editor-store";
import { useEffect } from "react";

/**
 * Global keyboard shortcuts for the editor.
 * Ctrl+Z: Undo
 * Ctrl+Shift+Z / Ctrl+Y: Redo
 * Delete/Backspace: Delete selected
 * Ctrl+D: Duplicate selected
 * V: Select tool
 * G: Translate tool
 * R: Rotate tool
 * S: Scale tool
 */
interface ShortcutOptions {
  onShowShortcuts?: () => void;
}

export function useKeyboardShortcuts(options?: ShortcutOptions) {
  const dispatch = useEditorStore((s) => s.dispatch);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const selectedObjectId = useEditorStore((s) => s.selectedObjectId);
  const setActiveTool = useEditorStore((s) => s.setActiveTool);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't handle shortcuts when typing in input fields
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      const ctrl = e.ctrlKey || e.metaKey;

      // Save (Ctrl+S) — dispatch custom event, handled by auto-save hook
      if (ctrl && e.key === "s") {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("editor:save"));
        return;
      }

      // Undo
      if (ctrl && !e.shiftKey && e.key === "z") {
        e.preventDefault();
        undo();
        return;
      }

      // Redo
      if (ctrl && e.shiftKey && e.key === "Z") {
        e.preventDefault();
        redo();
        return;
      }
      if (ctrl && e.key === "y") {
        e.preventDefault();
        redo();
        return;
      }

      // Delete (supports multi-selection)
      if (e.key === "Delete" || e.key === "Backspace") {
        const state = useEditorStore.getState();
        const toDelete = state.multiSelectedIds.length > 1
          ? [...state.multiSelectedIds]
          : state.selectedObjectId
            ? [state.selectedObjectId]
            : [];
        if (toDelete.length > 0) {
          e.preventDefault();
          for (const id of toDelete) {
            dispatch({ type: "DELETE_OBJECT", id });
          }
        }
        return;
      }

      // Duplicate
      if (ctrl && e.key === "d") {
        if (selectedObjectId) {
          e.preventDefault();
          const newId = crypto.randomUUID();
          dispatch({
            type: "DUPLICATE_OBJECT",
            sourceId: selectedObjectId,
            newId,
          });
          dispatch({ type: "SELECT_OBJECT", id: newId });
        }
        return;
      }

      // Camera shortcuts
      if (e.key === "Home") {
        e.preventDefault();
        window.__vibe3d_resetCamera?.();
        return;
      }
      if (!ctrl && e.key.toLowerCase() === "f") {
        e.preventDefault();
        window.__vibe3d_zoomToFit?.();
        return;
      }

      // Shortcuts help
      if (e.key === "?" || (e.key === "/" && e.shiftKey)) {
        e.preventDefault();
        options?.onShowShortcuts?.();
        return;
      }

      // Escape: clear mesh highlight first, then object selection
      if (e.key === "Escape") {
        const { highlightedMeshName } = useEditorStore.getState();
        if (highlightedMeshName) {
          useEditorStore.setState({ highlightedMeshName: null });
        } else if (selectedObjectId) {
          dispatch({ type: "SELECT_OBJECT", id: null });
        }
        return;
      }

      // Tool shortcuts
      if (!ctrl) {
        switch (e.key.toLowerCase()) {
          case "v":
            setActiveTool("select");
            break;
          case "g":
            setActiveTool("translate");
            break;
          case "r":
            setActiveTool("rotate");
            break;
          case "s":
            setActiveTool("scale");
            break;
        }
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [dispatch, undo, redo, selectedObjectId, setActiveTool, options]);
}
