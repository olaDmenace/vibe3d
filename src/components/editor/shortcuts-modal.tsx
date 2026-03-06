"use client";

import { useEffect } from "react";
import { SHORTCUT_GROUPS } from "@/lib/keyboard-shortcuts";

interface ShortcutsModalProps {
  open: boolean;
  onClose: () => void;
}

export function ShortcutsModal({ open, onClose }: ShortcutsModalProps) {
  useEffect(() => {
    if (!open) return;
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
        <div
          className="pointer-events-auto max-w-lg w-full mx-4 max-h-[70vh] overflow-y-auto rounded-2xl border shadow-2xl"
          style={{
            background: "#1F1F18",
            borderColor: "rgba(222, 220, 209, 0.15)",
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-6 py-4"
            style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.06)" }}
          >
            <h2
              className="text-sm font-medium text-white/90"
              style={{ fontFamily: "var(--font-spline-sans)" }}
            >
              Keyboard Shortcuts
            </h2>
            <button
              className="text-white/40 hover:text-white/70 transition-colors"
              onClick={onClose}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {SHORTCUT_GROUPS.map((group) => (
              <div key={group.title}>
                <h3
                  className="text-[10px] font-medium text-white/40 uppercase tracking-wider mb-2"
                  style={{ fontFamily: "var(--font-spline-sans)" }}
                >
                  {group.title}
                </h3>
                <div className="space-y-1.5">
                  {group.shortcuts.map((shortcut, i) => (
                    <div key={i} className="flex items-center justify-between py-1">
                      <span
                        className="text-[12px] text-white/70"
                        style={{ fontFamily: "var(--font-spline-sans)" }}
                      >
                        {shortcut.description}
                      </span>
                      <div className="flex items-center gap-1">
                        {shortcut.keys.map((key, j) => (
                          <span key={j} className="flex items-center">
                            <kbd
                              className="px-1.5 py-0.5 text-[10px] rounded text-white/50 font-mono"
                              style={{
                                background: "rgba(255, 255, 255, 0.06)",
                                border: "1px solid rgba(255, 255, 255, 0.1)",
                              }}
                            >
                              {key}
                            </kbd>
                            {j < shortcut.keys.length - 1 && (
                              <span className="text-white/30 text-[10px] mx-0.5">+</span>
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
