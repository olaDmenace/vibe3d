"use client";

import { useEditorStore } from "@/store/editor-store";
import { getSpawnPosition } from "@/lib/scene-utils";
import { Box, Circle, Minus, Triangle } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

const PRIMITIVES: { type: string; icon: React.ReactNode; label: string }[] = [
  { type: "cube", icon: <Box size={16} />, label: "Cube" },
  { type: "sphere", icon: <Circle size={16} />, label: "Sphere" },
  { type: "plane", icon: <Minus size={16} />, label: "Plane" },
  {
    type: "cylinder",
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <ellipse cx="12" cy="5" rx="8" ry="3" />
        <path d="M4 5v14c0 1.66 3.58 3 8 3s8-1.34 8-3V5" />
      </svg>
    ),
    label: "Cylinder",
  },
  { type: "cone", icon: <Triangle size={16} />, label: "Cone" },
  {
    type: "torus",
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      >
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
    label: "Torus",
  },
];

type EditorToolbarProps = {
  projectId?: string;
  projectName?: string;
  isAuthenticated?: boolean;
};

export function EditorToolbar({
  projectId,
  projectName,
  isAuthenticated = true,
}: EditorToolbarProps = {}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const dispatch = useEditorStore((s) => s.dispatch);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const pastLen = useEditorStore((s) => s.past.length);
  const futureLen = useEditorStore((s) => s.future.length);
  const snapToGrid = useEditorStore((s) => s.snapToGrid);

  const addPrimitive = useCallback(
    (type: string) => {
      const id = crypto.randomUUID();
      const pos = getSpawnPosition(useEditorStore.getState().scene);
      if (type !== "plane") pos[1] = 0.5;
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
            position: pos,
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
      setDropdownOpen(false);
    },
    [dispatch]
  );

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [dropdownOpen]);

  return (
    <div className="flex items-center gap-2">

      {/* ===== Primitives pill ===== */}
      <div
        className="flex items-center"
        style={{
          width: 104,
          height: 48,
          background: "rgba(0, 0, 0, 0.2)",
          borderRadius: 20,
          position: "relative",
        }}
      >
        {/* Create New Object Button */}
        <div ref={dropdownRef} className="relative">
          <button
            onClick={() => setDropdownOpen((prev) => !prev)}
            title="Create New Object"
            className="flex items-center justify-center cursor-pointer"
            style={{
              width: 32,
              height: 32,
              position: "absolute",
              left: 8,
              top: -16,
              background: "rgba(255, 255, 255, 0.08)",
              boxShadow:
                "0px 1.3px 5.19px rgba(0, 0, 0, 0.1), inset 0px 0.65px 0px rgba(255, 255, 255, 0.1)",
              borderRadius: 19,
              border: "none",
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              style={{ opacity: 0.8 }}
            >
              <path
                d="M8 3V13"
                stroke="white"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <path
                d="M3 8H13"
                stroke="white"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>

          {/* Primitives Dropdown */}
          {dropdownOpen && (
            <div
              className="absolute flex flex-col gap-0.5 py-1.5"
              style={{
                top: 24,
                left: 8,
                width: 140,
                background: "rgba(30, 30, 24, 0.95)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: 12,
                backdropFilter: "blur(16px)",
                boxShadow: "0px 8px 24px rgba(0, 0, 0, 0.4)",
              }}
            >
              {PRIMITIVES.map(({ type, icon, label }) => (
                <button
                  key={type}
                  onClick={() => addPrimitive(type)}
                  className="flex items-center gap-2 px-3 py-1.5 text-[11px] text-white/80 hover:bg-white/10 transition-colors cursor-pointer"
                  style={{ letterSpacing: "0.3px" }}
                >
                  <span className="opacity-60">{icon}</span>
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Separator */}
        <div
          style={{
            width: 4,
            height: 16,
            background: "rgba(255, 255, 255, 0.05)",
            borderRadius: 2,
            position: "absolute",
            left: 50,
            top: 16,
          }}
        />

        {/* Comment Tool Button */}
        <button
          title="Comment Tool"
          className="flex items-center justify-center cursor-pointer"
          style={{
            width: 32,
            height: 32,
            position: "absolute",
            left: 64,
            top: 8,
            borderRadius: 8,
            background: "transparent",
            border: "none",
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ opacity: 0.8 }}
          >
            <path
              d="M2.5 3.5C2.5 2.94772 2.94772 2.5 3.5 2.5H12.5C13.0523 2.5 13.5 2.94772 13.5 3.5V10C13.5 10.5523 13.0523 11 12.5 11H9L6 13.5V11H3.5C2.94772 11 2.5 10.5523 2.5 10V3.5Z"
              stroke="white"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      {/* ===== Undo / Redo / Snap pill ===== */}
      <div
        className="flex items-center gap-1 px-2"
        style={{
          height: 48,
          background: "rgba(0, 0, 0, 0.2)",
          borderRadius: 20,
        }}
      >
        {/* Undo */}
        <button
          onClick={undo}
          disabled={pastLen === 0}
          title="Undo (Ctrl+Z)"
          className="flex items-center justify-center cursor-pointer disabled:opacity-25 transition-opacity hover:bg-white/10"
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            border: "none",
            background: "transparent",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ opacity: 0.8 }}>
            <path d="M4 6h6a3 3 0 0 1 0 6H7" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M6 3L4 6l2 3" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </svg>
        </button>

        {/* Redo */}
        <button
          onClick={redo}
          disabled={futureLen === 0}
          title="Redo (Ctrl+Shift+Z)"
          className="flex items-center justify-center cursor-pointer disabled:opacity-25 transition-opacity hover:bg-white/10"
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            border: "none",
            background: "transparent",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ opacity: 0.8 }}>
            <path d="M12 6H6a3 3 0 0 0 0 6h3" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M10 3l2 3-2 3" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </svg>
        </button>

        {/* Separator */}
        <div style={{ width: 1, height: 16, background: "rgba(255, 255, 255, 0.08)", borderRadius: 1 }} />

        {/* Snap Toggle */}
        <button
          onClick={() => useEditorStore.setState({ snapToGrid: !snapToGrid })}
          title={`Snap to Grid: ${snapToGrid ? "ON" : "OFF"}`}
          className="flex items-center justify-center cursor-pointer transition-opacity hover:bg-white/10"
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            border: "none",
            background: snapToGrid ? "rgba(124, 196, 248, 0.15)" : "transparent",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ opacity: snapToGrid ? 1 : 0.5 }}>
            <path
              d="M1 4h14M1 8h14M1 12h14M4 1v14M8 1v14M12 1v14"
              stroke={snapToGrid ? "#7CC4F8" : "white"}
              strokeWidth="0.8"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      {/* ===== Camera pill ===== */}
      <div
        className="flex items-center gap-1 px-2"
        style={{
          height: 48,
          background: "rgba(0, 0, 0, 0.2)",
          borderRadius: 20,
        }}
      >
        {/* Reset Camera */}
        <button
          onClick={() => window.__vibe3d_resetCamera?.()}
          title="Reset Camera (Home)"
          className="flex items-center justify-center cursor-pointer transition-opacity hover:bg-white/10"
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            border: "none",
            background: "transparent",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ opacity: 0.8 }}>
            <path d="M2 8.5L8 3L14 8.5" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M3.5 7.5V13H6.5V10H9.5V13H12.5V7.5" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {/* Zoom to Fit */}
        <button
          onClick={() => window.__vibe3d_zoomToFit?.()}
          title="Zoom to Fit (F)"
          className="flex items-center justify-center cursor-pointer transition-opacity hover:bg-white/10"
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            border: "none",
            background: "transparent",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ opacity: 0.8 }}>
            <path d="M2 5V2H5" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M14 5V2H11" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M2 11V14H5" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M14 11V14H11" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            <rect x="5" y="5" width="6" height="6" rx="1" stroke="white" strokeWidth="1" />
          </svg>
        </button>
      </div>
    </div>
  );
}
