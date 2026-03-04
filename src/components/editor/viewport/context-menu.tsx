"use client";

import { useState, useEffect, useCallback } from "react";
import { useEditorStore } from "@/store/editor-store";

export function ViewportContextMenu() {
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);

  const selectedObjectId = useEditorStore((s) => s.selectedObjectId);
  const selectedObject = useEditorStore((s) =>
    s.selectedObjectId ? s.scene.objects[s.selectedObjectId] : null
  );
  const dispatch = useEditorStore((s) => s.dispatch);

  const handleContextMenu = useCallback((e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (!target.closest("canvas")) return;
    e.preventDefault();
    setMenu({ x: e.clientX, y: e.clientY });
  }, []);

  useEffect(() => {
    if (!menu) return;
    function close() { setMenu(null); }
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [menu]);

  useEffect(() => {
    window.addEventListener("contextmenu", handleContextMenu);
    return () => window.removeEventListener("contextmenu", handleContextMenu);
  }, [handleContextMenu]);

  if (!menu) return null;

  return (
    <div
      className="fixed z-[60]"
      style={{
        left: menu.x,
        top: menu.y,
        background: "#1F1F18",
        border: "1px solid rgba(222, 220, 209, 0.15)",
        borderRadius: 12,
        backdropFilter: "blur(16px)",
        boxShadow: "0px 8px 24px rgba(0, 0, 0, 0.4)",
        minWidth: 160,
        padding: "4px 0",
        fontFamily: "'Aeonik Pro', sans-serif",
      }}
    >
      {selectedObject && selectedObjectId ? (
        <>
          <ContextButton
            label="Duplicate"
            shortcut="Ctrl+D"
            onClick={() => {
              const newId = crypto.randomUUID();
              dispatch({ type: "DUPLICATE_OBJECT", sourceId: selectedObjectId, newId });
              dispatch({ type: "SELECT_OBJECT", id: newId });
              setMenu(null);
            }}
          />
          <ContextButton
            label={selectedObject.visible ? "Hide" : "Show"}
            onClick={() => {
              dispatch({ type: "SET_VISIBILITY", id: selectedObjectId, visible: !selectedObject.visible });
              setMenu(null);
            }}
          />
          <ContextButton
            label={selectedObject.locked ? "Unlock" : "Lock"}
            onClick={() => {
              dispatch({ type: "SET_LOCKED", id: selectedObjectId, locked: !selectedObject.locked });
              setMenu(null);
            }}
          />
          <div style={{ height: 1, background: "rgba(255, 255, 255, 0.06)", margin: "4px 0" }} />
          <ContextButton
            label="Delete"
            shortcut="Del"
            danger
            onClick={() => {
              dispatch({ type: "DELETE_OBJECT", id: selectedObjectId });
              setMenu(null);
            }}
          />
        </>
      ) : (
        <div style={{ padding: "6px 12px", fontSize: 11, color: "rgba(255, 255, 255, 0.3)" }}>
          No object selected
        </div>
      )}
    </div>
  );
}

function ContextButton({
  label,
  shortcut,
  danger,
  onClick,
}: {
  label: string;
  shortcut?: string;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className="flex w-full items-center justify-between px-3 py-1.5 transition-colors hover:bg-white/[0.06]"
      style={{
        fontSize: 11,
        color: danger ? "#f87171" : "rgba(255, 255, 255, 0.7)",
      }}
      onClick={onClick}
    >
      <span>{label}</span>
      {shortcut && (
        <span style={{ fontSize: 10, color: "rgba(255, 255, 255, 0.25)", marginLeft: 12 }}>
          {shortcut}
        </span>
      )}
    </button>
  );
}
