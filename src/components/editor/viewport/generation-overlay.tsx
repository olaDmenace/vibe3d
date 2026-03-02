"use client";

import { useEffect, useState } from "react";

type GenerationOverlayProps = {
  isGenerating: boolean;
  prompt?: string;
  progress?: number; // 0-100
};

export function GenerationOverlay({ isGenerating, prompt, progress }: GenerationOverlayProps) {
  const [dots, setDots] = useState("");

  useEffect(() => {
    if (!isGenerating) return;
    const interval = setInterval(() => {
      setDots((d) => (d.length >= 3 ? "" : d + "."));
    }, 500);
    return () => clearInterval(interval);
  }, [isGenerating]);

  if (!isGenerating) return null;

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
      <div className="pointer-events-auto flex flex-col items-center gap-4 rounded-2xl bg-black/60 backdrop-blur-md px-8 py-6 text-center max-w-md">
        {/* Spinner */}
        <div className="h-10 w-10 rounded-full border-2 border-white/20 border-t-white/80 animate-spin" />

        {/* Status text */}
        <div>
          <p className="text-sm font-medium text-white/90">
            Generating your 3D model{dots}
          </p>
          {prompt && (
            <p className="mt-1 text-xs text-white/50 italic truncate max-w-[280px]">
              &ldquo;{prompt}&rdquo;
            </p>
          )}
        </div>

        {/* Progress bar (if progress is available) */}
        {progress !== undefined && progress > 0 && (
          <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-white/70 transition-all duration-500"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        )}

        <p className="text-[10px] text-white/30">
          This usually takes 30–60 seconds
        </p>
      </div>
    </div>
  );
}
