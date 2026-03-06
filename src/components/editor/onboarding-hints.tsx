"use client";

import { useState, useEffect } from "react";

const HINTS = [
  {
    id: "add-objects",
    message: "Click + to add 3D primitives like cubes, spheres, and more",
  },
  {
    id: "chat-generate",
    message: "Type below to generate 3D models with AI or edit your scene",
  },
  {
    id: "export",
    message: "Export your scene as .glb, .obj, or .stl when you're done",
  },
];

export function OnboardingHints() {
  const [currentHintIndex, setCurrentHintIndex] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  if (dismissed || !visible || currentHintIndex >= HINTS.length) return null;

  const hint = HINTS[currentHintIndex];

  function nextHint() {
    if (currentHintIndex < HINTS.length - 1) {
      setCurrentHintIndex((i) => i + 1);
    } else {
      setDismissed(true);
    }
  }

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 animate-in">
      <div
        className="text-white rounded-xl px-4 py-3 shadow-lg max-w-sm flex items-start gap-3"
        style={{
          background: "rgba(99, 102, 241, 0.9)",
          backdropFilter: "blur(8px)",
        }}
      >
        <div className="flex-1">
          <p className="text-[12px]" style={{ fontFamily: "var(--font-spline-sans)" }}>
            {hint.message}
          </p>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-[10px] text-indigo-200">
              {currentHintIndex + 1} of {HINTS.length}
            </span>
            <button
              className="text-[10px] text-indigo-200 hover:text-white underline"
              onClick={() => setDismissed(true)}
            >
              Skip all
            </button>
          </div>
        </div>
        <button
          className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-[11px] font-medium transition-colors"
          onClick={nextHint}
        >
          {currentHintIndex < HINTS.length - 1 ? "Next" : "Got it"}
        </button>
      </div>
    </div>
  );
}
