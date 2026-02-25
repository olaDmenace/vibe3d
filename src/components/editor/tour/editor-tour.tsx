"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";

const TOUR_STEPS = [
  {
    title: "Your 3D Model",
    body: "This is where your creation appears. Drag to rotate, scroll to zoom.",
    target: "viewport", // center of viewport
  },
  {
    title: "AI Assistant",
    body: "Type here to modify your model with natural language commands.",
    target: "chat", // above chat input
  },
  {
    title: "Models List",
    body: "See all the components of your model and select them.",
    target: "sidebar", // over left sidebar
  },
];

const STORAGE_KEY = "vibe3d_tour_completed";

export function EditorTour() {
  const [step, setStep] = useState<number | null>(null);

  useEffect(() => {
    // Only show tour if not already completed
    const completed = localStorage.getItem(STORAGE_KEY);
    if (!completed) {
      // Small delay so the editor renders first
      const timer = setTimeout(() => setStep(0), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  if (step === null) return null;

  const current = TOUR_STEPS[step];
  const totalSteps = TOUR_STEPS.length;
  const isLast = step === totalSteps - 1;

  const handleSkip = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setStep(null);
  };

  const handleNext = () => {
    if (isLast) {
      localStorage.setItem(STORAGE_KEY, "true");
      setStep(null);
    } else {
      setStep(step + 1);
    }
  };

  // Position the tooltip based on the target
  const positionClasses = getPositionClasses(current.target);

  return (
    <>
      {/* Backdrop overlay */}
      <div className="pointer-events-none absolute inset-0 z-40 bg-[rgba(0,0,0,0.3)]" />

      {/* Tooltip */}
      <div
        className={`absolute z-50 w-[280px] overflow-hidden rounded-xl border border-[rgba(255,255,255,0.1)] bg-[#1a1a1a] shadow-[0_8px_32px_rgba(0,0,0,0.4)] ${positionClasses}`}
      >
        {/* Warm gradient bottom accent */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[rgba(180,140,160,0.15)] to-transparent" />

        <div className="relative p-4">
          {/* Header: dots + close */}
          <div className="mb-3 flex items-center justify-between">
            <div className="flex gap-1.5">
              {TOUR_STEPS.map((_, i) => (
                <div
                  key={i}
                  className={`h-2 w-2 rounded-full ${
                    i <= step
                      ? "bg-white"
                      : "border border-[rgba(255,255,255,0.3)] bg-transparent"
                  }`}
                />
              ))}
            </div>
            <button
              onClick={handleSkip}
              className="text-[rgba(255,255,255,0.5)] transition-colors hover:text-white"
            >
              <X size={14} />
            </button>
          </div>

          {/* Title */}
          <h3 className="text-sm font-semibold text-white">{current.title}</h3>

          {/* Body */}
          <p className="mt-1.5 text-[13px] leading-[18px] text-[rgba(255,255,255,0.6)]">
            {current.body}
          </p>

          {/* Actions */}
          <div className="mt-4 flex items-center justify-end gap-2">
            <button
              onClick={handleSkip}
              className="rounded-md px-3 py-1.5 text-[13px] text-[rgba(255,255,255,0.6)] transition-colors hover:bg-[rgba(255,255,255,0.08)] hover:text-white"
            >
              Skip
            </button>
            <button
              onClick={handleNext}
              className="rounded-md bg-[rgba(255,255,255,0.12)] px-3 py-1.5 text-[13px] text-white transition-colors hover:bg-[rgba(255,255,255,0.2)]"
            >
              {isLast ? "Try it now" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function getPositionClasses(target: string): string {
  switch (target) {
    case "viewport":
      // Center of the viewport area
      return "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2";
    case "chat":
      // Bottom-left, above the chat input
      return "bottom-24 left-[320px]";
    case "sidebar":
      // Top-left, over the sidebar area
      return "left-[40px] top-[120px]";
    default:
      return "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2";
  }
}
