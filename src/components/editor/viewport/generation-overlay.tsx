"use client";

import { useEffect, useState } from "react";
import { useGenerationStore } from "@/store/generation-store";

type GenerationOverlayProps = {
  isGenerating: boolean;
  prompt?: string;
  progress?: number; // 0-100
  startedAt?: number | null;
};

function getGenerationMessage(progress: number): string {
  if (progress < 10) return "Starting generation...";
  if (progress < 30) return "Creating base geometry...";
  if (progress < 50) return "Shaping the model...";
  if (progress < 60) return "Refining details...";
  if (progress < 80) return "Applying textures...";
  if (progress < 95) return "Almost there...";
  return "Finalizing...";
}

export function GenerationOverlay({ isGenerating, prompt, progress, startedAt }: GenerationOverlayProps) {
  const [dots, setDots] = useState("");
  const [elapsed, setElapsed] = useState(
    () => (startedAt ? Math.floor((Date.now() - startedAt) / 1000) : 0)
  );
  const sceneObjects = useGenerationStore((s) => s.sceneObjects);

  useEffect(() => {
    if (!isGenerating) return;
    const interval = setInterval(() => {
      setDots((d) => (d.length >= 3 ? "" : d + "."));
    }, 500);
    return () => clearInterval(interval);
  }, [isGenerating]);

  useEffect(() => {
    if (!isGenerating || !startedAt) return;
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [isGenerating, startedAt]);

  if (!isGenerating) return null;

  // Scene generation mode (multiple objects)
  if (sceneObjects.length > 0) {
    const completed = sceneObjects.filter((o) => o.status === "complete").length;
    const total = sceneObjects.length;

    return (
      <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 backdrop-blur-sm pointer-events-none">
        <div
          className="pointer-events-auto text-center max-w-sm rounded-2xl p-6"
          style={{
            background: "#1F1F18",
            border: "1px solid rgba(222, 220, 209, 0.15)",
            boxShadow: "0 8px 30px rgba(0, 0, 0, 0.4)",
          }}
        >
          <p className="text-sm font-medium text-white/90 mb-4 font-body">
            Building Scene ({completed}/{total})
          </p>

          <div className="space-y-2 text-left">
            {sceneObjects.map((obj, i) => (
              <div key={i} className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    obj.status === "complete"
                      ? "bg-emerald-500"
                      : obj.status === "generating"
                        ? "bg-indigo-400 animate-pulse"
                        : obj.status === "failed"
                          ? "bg-red-400"
                          : "bg-white/10"
                  }`}
                />
                <span
                  className={`text-xs truncate ${
                    obj.status === "generating"
                      ? "text-white/90"
                      : obj.status === "complete"
                        ? "text-white/50"
                        : "text-white/35"
                  }`}
                >
                  {obj.name}
                </span>
                {obj.status === "complete" && (
                  <span className="text-[10px] text-emerald-500 ml-auto">
                    ✓
                  </span>
                )}
              </div>
            ))}
          </div>

          <div className="mt-4 w-full h-1 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all duration-500"
              style={{ width: `${(completed / total) * 100}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  // Single object generation mode
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 backdrop-blur-sm pointer-events-none">
      <div className="pointer-events-auto text-center max-w-sm">
        {/* Spinner */}
        <div className="w-10 h-10 mx-auto mb-4">
          <svg className="animate-spin text-indigo-400" viewBox="0 0 24 24" fill="none" width="40" height="40">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" opacity="0.2" />
            <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>

        <p className="text-sm font-medium text-white/90 mb-1 font-body">
          {progress !== undefined && progress > 0
            ? getGenerationMessage(progress)
            : `Generating your 3D model${dots}`}
        </p>
        {prompt && (
          <p className="text-xs text-white/40 italic truncate max-w-[280px] mx-auto mb-4 font-body">
            &ldquo;{prompt}&rdquo;
          </p>
        )}

        {/* Progress bar */}
        {progress !== undefined && progress > 0 && (
          <div className="w-48 mx-auto h-1 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-indigo-500 transition-all duration-500"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        )}

        <p className="text-[10px] text-white/30 mt-2 font-mono">
          {elapsed < 60
            ? `${elapsed}s elapsed \u2014 usually takes 30\u201360 seconds`
            : `${Math.floor(elapsed / 60)}m ${elapsed % 60}s elapsed \u2014 almost there`}
        </p>
      </div>
    </div>
  );
}
