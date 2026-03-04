"use client";

import { useEditorStore } from "@/store/editor-store";
import { useGenerationStore } from "@/store/generation-store";
import { getSpawnPosition } from "@/lib/scene-utils";

export function EmptyStateOverlay() {
  const objectCount = useEditorStore(
    (s) => Object.keys(s.scene.objects).length
  );
  const dispatch = useEditorStore((s) => s.dispatch);
  const isGenerating = useGenerationStore((s) => s.isGenerating);

  if (objectCount > 0 || isGenerating) return null;

  const handleAddCube = () => {
    const id = crypto.randomUUID();
    const pos = getSpawnPosition(useEditorStore.getState().scene);
    pos[1] = 0.5;
    dispatch({
      type: "ADD_OBJECT",
      id,
      payload: {
        name: "Cube",
        parentId: null,
        assetId: "cube",
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
  };

  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <svg
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="rgba(255,255,255,0.2)"
          strokeWidth="1"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
          <line x1="12" y1="22.08" x2="12" y2="12" />
        </svg>
        <p className="font-[family-name:var(--font-spline-sans)] text-[13px] text-white/40">
          Your scene is empty
        </p>
        <p className="font-[family-name:var(--font-spline-sans)] text-[11px] text-white/25">
          Use the chat to generate a model, or add a primitive
        </p>
        <button
          type="button"
          onClick={handleAddCube}
          className="pointer-events-auto rounded-[12px] bg-white/[0.08] px-4 py-2 font-[family-name:var(--font-spline-sans)] text-[11px] font-medium text-white/70 transition-colors hover:bg-white/[0.12]"
          style={{
            boxShadow:
              "0px 2px 8px rgba(0,0,0,0.1), inset 0px 1px 0px rgba(255,255,255,0.1)",
          }}
        >
          Add Cube
        </button>
      </div>
    </div>
  );
}
