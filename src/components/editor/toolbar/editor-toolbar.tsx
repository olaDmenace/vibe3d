"use client";

import { useEditorStore } from "@/store/editor-store";
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

  const addPrimitive = useCallback(
    (type: string) => {
      const id = crypto.randomUUID();
      const objectCount = Object.keys(useEditorStore.getState().scene.objects).length;
      const offset = objectCount * 1.5;
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
            position: [offset, 0.5, 0],
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
    <div
      className="absolute z-20"
      style={{ left: 262, top: 16 }}
    >
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
            {/* Plus Icon 16x16 */}
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
          {/* Chat Bubble Icon 16x16 */}
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
    </div>
  );
}
