"use client";

import { useEditorStore } from "@/store/editor-store";
import type { ActiveTool } from "@/store/editor-store";
import {
  MousePointer2,
  Move,
  RotateCcw,
  Maximize,
  Box,
  Circle,
  Triangle,
  Minus,
  Cylinder,
  Undo2,
  Redo,
  Trash2,
  Copy,
  ArrowLeft,
  Save,
} from "lucide-react";
import { useCallback, useState } from "react";
import Link from "next/link";

const TOOLS: { tool: ActiveTool; icon: React.ReactNode; label: string }[] = [
  { tool: "select", icon: <MousePointer2 size={16} />, label: "Select (V)" },
  { tool: "translate", icon: <Move size={16} />, label: "Move (G)" },
  { tool: "rotate", icon: <RotateCcw size={16} />, label: "Rotate (R)" },
  { tool: "scale", icon: <Maximize size={16} />, label: "Scale (S)" },
];

const PRIMITIVES: { type: string; icon: React.ReactNode; label: string }[] = [
  { type: "cube", icon: <Box size={16} />, label: "Cube" },
  { type: "sphere", icon: <Circle size={16} />, label: "Sphere" },
  { type: "plane", icon: <Minus size={16} />, label: "Plane" },
  { type: "cylinder", icon: <Cylinder size={16} />, label: "Cylinder" },
  { type: "cone", icon: <Triangle size={16} />, label: "Cone" },
];

type EditorToolbarProps = {
  projectId?: string;
  projectName?: string;
};

export function EditorToolbar({ projectId, projectName }: EditorToolbarProps = {}) {
  const [saving, setSaving] = useState(false);
  const activeTool = useEditorStore((s) => s.activeTool);
  const setActiveTool = useEditorStore((s) => s.setActiveTool);
  const dispatch = useEditorStore((s) => s.dispatch);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const selectedObjectId = useEditorStore((s) => s.selectedObjectId);

  const addPrimitive = useCallback(
    (type: string) => {
      const id = crypto.randomUUID();
      dispatch({
        type: "ADD_OBJECT",
        id,
        payload: {
          name: type.charAt(0).toUpperCase() + type.slice(1),
          parentId: null,
          assetId: type,
          visible: true,
          locked: false,
          transform: {
            position: [0, 0.5, 0],
            rotation: [0, 0, 0],
            scale: [1, 1, 1],
          },
          materialOverrides: [
            {
              materialIndex: 0,
              color: "#888888",
              roughness: 0.5,
              metalness: 0,
            },
          ],
          metadata: {},
        },
      });
      dispatch({ type: "SELECT_OBJECT", id });
    },
    [dispatch]
  );

  const deleteSelected = useCallback(() => {
    if (selectedObjectId) {
      dispatch({ type: "DELETE_OBJECT", id: selectedObjectId });
    }
  }, [dispatch, selectedObjectId]);

  const duplicateSelected = useCallback(() => {
    if (selectedObjectId) {
      const newId = crypto.randomUUID();
      dispatch({
        type: "DUPLICATE_OBJECT",
        sourceId: selectedObjectId,
        newId,
      });
      dispatch({ type: "SELECT_OBJECT", id: newId });
    }
  }, [dispatch, selectedObjectId]);

  const manualSave = useCallback(async () => {
    if (!projectId || saving) return;
    setSaving(true);
    const sceneState = useEditorStore.getState().getSerializableState();
    await fetch(`/api/projects/${projectId}/scene`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scene_graph: sceneState }),
    });
    setSaving(false);
  }, [projectId, saving]);

  return (
    <div className="flex h-11 items-center gap-1 border-b border-editor-border bg-editor-surface px-3">
      {/* Back + project name */}
      {projectId ? (
        <Link
          href="/dashboard"
          className="mr-1 flex h-7 w-7 items-center justify-center rounded text-editor-text-muted transition-colors hover:bg-editor-surface-hover hover:text-editor-text"
          title="Back to Dashboard"
        >
          <ArrowLeft size={16} />
        </Link>
      ) : null}
      <span className="mr-3 text-sm font-semibold text-editor-text">
        {projectName || "Vibe3D"}
      </span>

      <div className="mr-2 h-5 w-px bg-editor-border" />

      {/* Transform tools */}
      {TOOLS.map(({ tool, icon, label }) => (
        <button
          key={tool}
          onClick={() => setActiveTool(tool)}
          title={label}
          className={`flex h-7 w-7 items-center justify-center rounded transition-colors ${
            activeTool === tool
              ? "bg-editor-accent text-white"
              : "text-editor-text-muted hover:bg-editor-surface-hover hover:text-editor-text"
          }`}
        >
          {icon}
        </button>
      ))}

      <div className="mr-2 ml-2 h-5 w-px bg-editor-border" />

      {/* Add primitives */}
      {PRIMITIVES.map(({ type, icon, label }) => (
        <button
          key={type}
          onClick={() => addPrimitive(type)}
          title={`Add ${label}`}
          className="flex h-7 w-7 items-center justify-center rounded text-editor-text-muted transition-colors hover:bg-editor-surface-hover hover:text-editor-text"
        >
          {icon}
        </button>
      ))}

      <div className="mr-2 ml-2 h-5 w-px bg-editor-border" />

      {/* Undo / Redo */}
      <button
        onClick={undo}
        title="Undo (Ctrl+Z)"
        className="flex h-7 w-7 items-center justify-center rounded text-editor-text-muted transition-colors hover:bg-editor-surface-hover hover:text-editor-text"
      >
        <Undo2 size={16} />
      </button>
      <button
        onClick={redo}
        title="Redo (Ctrl+Shift+Z)"
        className="flex h-7 w-7 items-center justify-center rounded text-editor-text-muted transition-colors hover:bg-editor-surface-hover hover:text-editor-text"
      >
        <Redo size={16} />
      </button>

      <div className="mr-2 ml-2 h-5 w-px bg-editor-border" />

      {/* Object actions */}
      <button
        onClick={duplicateSelected}
        disabled={!selectedObjectId}
        title="Duplicate (Ctrl+D)"
        className="flex h-7 w-7 items-center justify-center rounded text-editor-text-muted transition-colors hover:bg-editor-surface-hover hover:text-editor-text disabled:opacity-30"
      >
        <Copy size={16} />
      </button>
      <button
        onClick={deleteSelected}
        disabled={!selectedObjectId}
        title="Delete (Del)"
        className="flex h-7 w-7 items-center justify-center rounded text-editor-text-muted transition-colors hover:bg-editor-surface-hover hover:text-editor-text disabled:text-editor-danger disabled:opacity-30"
      >
        <Trash2 size={16} />
      </button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Manual save */}
      {projectId && (
        <button
          onClick={manualSave}
          disabled={saving}
          title="Save (Ctrl+S)"
          className="flex h-7 items-center gap-1.5 rounded px-2 text-editor-text-muted transition-colors hover:bg-editor-surface-hover hover:text-editor-text disabled:opacity-50"
        >
          <Save size={14} />
          <span className="text-xs">{saving ? "Saving..." : "Save"}</span>
        </button>
      )}
    </div>
  );
}
