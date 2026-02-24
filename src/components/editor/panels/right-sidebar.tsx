"use client";

import { useEditorStore } from "@/store/editor-store";
import type { SidebarTab } from "@/store/editor-store";
import { SceneHierarchy } from "./scene-hierarchy";
import { PropertiesPanel } from "./properties-panel";
import { Layers, SlidersHorizontal, FolderOpen } from "lucide-react";

const TABS: { tab: SidebarTab; icon: React.ReactNode; label: string }[] = [
  { tab: "hierarchy", icon: <Layers size={14} />, label: "Scene" },
  { tab: "properties", icon: <SlidersHorizontal size={14} />, label: "Properties" },
  { tab: "assets", icon: <FolderOpen size={14} />, label: "Assets" },
];

export function RightSidebar() {
  const sidebarTab = useEditorStore((s) => s.sidebarTab);
  const setSidebarTab = useEditorStore((s) => s.setSidebarTab);

  return (
    <div className="flex h-full w-64 flex-col border-l border-editor-border bg-editor-surface">
      {/* Tab bar */}
      <div className="flex border-b border-editor-border">
        {TABS.map(({ tab, icon, label }) => (
          <button
            key={tab}
            onClick={() => setSidebarTab(tab)}
            title={label}
            className={`flex flex-1 items-center justify-center gap-1.5 py-2 text-[11px] transition-colors ${
              sidebarTab === tab
                ? "border-b-2 border-editor-accent text-editor-text"
                : "text-editor-text-muted hover:text-editor-text"
            }`}
          >
            {icon}
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        {sidebarTab === "hierarchy" && <SceneHierarchy />}
        {sidebarTab === "properties" && <PropertiesPanel />}
        {sidebarTab === "assets" && (
          <div className="flex h-full items-center justify-center px-3 text-center text-xs text-editor-text-dim">
            Asset management coming in Phase 3.
          </div>
        )}
      </div>
    </div>
  );
}
