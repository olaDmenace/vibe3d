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
export function useKeyboardShortcuts() {
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

      // Delete
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedObjectId) {
          e.preventDefault();
          dispatch({ type: "DELETE_OBJECT", id: selectedObjectId });
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
  }, [dispatch, undo, redo, selectedObjectId, setActiveTool]);
}
