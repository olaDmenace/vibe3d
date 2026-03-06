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
      className="dropdown-menu fixed z-[60] font-body"
      style={{
        left: menu.x,
        top: menu.y,
        backdropFilter: "blur(16px)",
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
          <div className="dropdown-separator" />
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
      className={`dropdown-item text-[11px] ${danger ? "dropdown-item--danger" : ""}`}
      onClick={onClick}
    >
      <span>{label}</span>
      {shortcut && (
        <span className="ml-auto text-[10px] text-white/25">
          {shortcut}
        </span>
      )}
    </button>
  );
}
