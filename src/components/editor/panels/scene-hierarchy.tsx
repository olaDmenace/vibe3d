"use client";

import { useEditorStore } from "@/store/editor-store";
import {
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Box,
  Circle,
  Minus,
  Cylinder,
  Triangle,
  Hexagon,
} from "lucide-react";

const PRIMITIVE_ICONS: Record<string, React.ReactNode> = {
  cube: <Box size={14} />,
  sphere: <Circle size={14} />,
  plane: <Minus size={14} />,
  cylinder: <Cylinder size={14} />,
  cone: <Triangle size={14} />,
  torus: <Hexagon size={14} />,
};

export function SceneHierarchy() {
  const objects = useEditorStore((s) => s.scene.objects);
  const selectedObjectId = useEditorStore((s) => s.selectedObjectId);
  const dispatch = useEditorStore((s) => s.dispatch);

  const objectList = Object.values(objects);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-editor-border px-3 py-2">
        <h3 className="text-xs font-medium tracking-wide text-editor-text-muted uppercase">
          Scene
        </h3>
      </div>
      <div className="flex-1 overflow-y-auto">
        {objectList.length === 0 ? (
          <div className="px-3 py-6 text-center text-xs text-editor-text-dim">
            No objects in scene.
            <br />
            Use the toolbar to add primitives.
          </div>
        ) : (
          <div className="py-1">
            {objectList.map((obj) => (
              <div
                key={obj.id}
                onClick={() => dispatch({ type: "SELECT_OBJECT", id: obj.id })}
                className={`group flex h-8 cursor-pointer items-center gap-2 px-3 text-xs transition-colors ${
                  selectedObjectId === obj.id
                    ? "bg-editor-accent/20 text-editor-text"
                    : "text-editor-text-muted hover:bg-editor-surface-hover hover:text-editor-text"
                }`}
              >
                <span className="flex-shrink-0 text-editor-text-dim">
                  {PRIMITIVE_ICONS[obj.assetId] ?? <Box size={14} />}
                </span>
                <span className="min-w-0 flex-1 truncate">{obj.name}</span>
                {typeof obj.metadata?.provider === "string" && (
                  <span
                    className="flex-shrink-0 rounded px-1 py-px text-[8px] font-medium leading-none"
                    style={{
                      background: obj.metadata.provider === "tripo" ? "rgba(124, 196, 248, 0.15)" : "rgba(168, 85, 247, 0.15)",
                      color: obj.metadata.provider === "tripo" ? "rgba(124, 196, 248, 0.7)" : "rgba(168, 85, 247, 0.7)",
                    }}
                    title={obj.metadata.provider === "tripo" ? "Generated with Tripo" : "Generated with Meshy"}
                  >
                    {obj.metadata.provider === "tripo" ? "T" : "M"}
                  </span>
                )}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      dispatch({
                        type: "SET_VISIBILITY",
                        id: obj.id,
                        visible: !obj.visible,
                      });
                    }}
                    className="text-editor-text-dim hover:text-editor-text"
                    title={obj.visible ? "Hide" : "Show"}
                  >
                    {obj.visible ? <Eye size={12} /> : <EyeOff size={12} />}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      dispatch({
                        type: "SET_LOCKED",
                        id: obj.id,
                        locked: !obj.locked,
                      });
                    }}
                    className="text-editor-text-dim hover:text-editor-text"
                    title={obj.locked ? "Unlock" : "Lock"}
                  >
                    {obj.locked ? <Lock size={12} /> : <Unlock size={12} />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
