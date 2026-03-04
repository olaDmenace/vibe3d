"use client";

import { useEditorStore } from "@/store/editor-store";
import { useEffect, useState } from "react";

function formatTimeAgo(ts: number): string {
  const seconds = Math.floor((Date.now() - ts) / 1000);
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

export function SaveStatusIndicator() {
  const isDirty = useEditorStore((s) => s.isDirty);
  const isSaving = useEditorStore((s) => s.isSaving);
  const lastSavedAt = useEditorStore((s) => s.lastSavedAt);
  const [, setTick] = useState(0);

  // Refresh time-ago label every 10s
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 10_000);
    return () => clearInterval(interval);
  }, []);

  let dotColor: string;
  let label: string;

  if (isSaving) {
    dotColor = "bg-amber-400 animate-pulse";
    label = "Saving...";
  } else if (isDirty) {
    dotColor = "bg-amber-400";
    label = "Unsaved changes";
  } else if (lastSavedAt) {
    dotColor = "bg-emerald-400";
    label = `Saved ${formatTimeAgo(lastSavedAt)}`;
  } else {
    return null;
  }

  return (
    <div className="flex items-center gap-1.5 rounded-full bg-black/20 px-2.5 py-1">
      <div className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />
      <span className="font-[family-name:var(--font-spline-sans)] text-[10px] text-white/50">
        {label}
      </span>
    </div>
  );
}
