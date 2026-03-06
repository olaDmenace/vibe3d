"use client";

import { useEditorStore } from "@/store/editor-store";
import type { SceneObject } from "@/types/scene";

interface MaterialEditorProps {
  object: SceneObject;
  meshName?: string | null;
}

export function MaterialEditor({ object, meshName }: MaterialEditorProps) {
  const dispatch = useEditorStore((s) => s.dispatch);

  const currentOverride = meshName
    ? object.materialOverrides.find((o) => o.meshName === meshName)
    : object.materialOverrides.find((o) => !o.meshName) ?? object.materialOverrides[0];

  const color = currentOverride?.color ?? "#888888";
  const roughness = currentOverride?.roughness ?? 0.5;
  const metalness = currentOverride?.metalness ?? 0;
  const opacity = currentOverride?.opacity ?? 1;

  function updateMaterial(updates: Partial<{
    color: string;
    roughness: number;
    metalness: number;
    opacity: number;
  }>) {
    dispatch({
      type: "UPDATE_MATERIAL",
      id: object.id,
      overrides: [{
        materialIndex: 0,
        ...(meshName ? { meshName } : {}),
        ...updates,
      }],
    });
  }

  const targetLabel = meshName
    ? meshName.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    : null;

  return (
    <div className="px-3 pb-2">
      <div className="flex items-center justify-between py-2">
        <span className="font-[family-name:var(--font-spline-sans)] text-[11px] font-semibold tracking-[0.3px] text-white/[0.95]">
          Material{targetLabel ? ` — ${targetLabel}` : ""}
        </span>
      </div>

      {/* Color */}
      <div className="flex items-center gap-2 py-[3px]">
        <span className="w-[52px] shrink-0 font-[family-name:var(--font-spline-sans)] text-[11px] text-white/60">
          Color
        </span>
        <div className="flex flex-1 items-center gap-1.5">
          <div className="relative h-6 w-6 shrink-0">
            <div
              className="h-6 w-6 rounded-[8px]"
              style={{
                backgroundColor: color,
                boxShadow: "inset 0px 0px 0px 1px rgba(255,255,255,0.05)",
              }}
            />
            <input
              type="color"
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              value={color}
              onChange={(e) => updateMaterial({ color: e.target.value })}
            />
          </div>
          <div className="flex h-6 flex-1 items-center rounded-[8px] bg-white/[0.05] px-2">
            <span className="font-[family-name:var(--font-spline-sans)] text-[11px] text-white/70">
              {color}
            </span>
          </div>
        </div>
      </div>

      {/* Roughness */}
      <SliderRow
        label="Roughness"
        value={roughness}
        onChange={(v) => updateMaterial({ roughness: v })}
      />

      {/* Metalness */}
      <SliderRow
        label="Metalness"
        value={metalness}
        onChange={(v) => updateMaterial({ metalness: v })}
      />

      {/* Opacity */}
      <SliderRow
        label="Opacity"
        value={opacity}
        onChange={(v) => updateMaterial({ opacity: v })}
      />
    </div>
  );
}

function SliderRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-2 py-[3px]">
      <span className="w-[52px] shrink-0 font-[family-name:var(--font-spline-sans)] text-[11px] text-white/60">
        {label}
      </span>
      <div className="flex flex-1 items-center gap-1.5">
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="flex-1"
        />
        <span className="w-[32px] shrink-0 text-right font-[family-name:var(--font-spline-sans)] text-[10px] text-white/40">
          {value.toFixed(2)}
        </span>
      </div>
    </div>
  );
}
