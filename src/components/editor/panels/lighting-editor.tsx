"use client";

import { useEditorStore } from "@/store/editor-store";
import { useCallback } from "react";

function LightingSlider({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-[3px]">
      <span className="w-[52px] shrink-0 font-[family-name:var(--font-spline-sans)] text-[11px] text-white/60">
        {label}
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-white/10 accent-[#7CC4F8] [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
      />
      <span className="w-[32px] shrink-0 text-right font-[family-name:var(--font-spline-sans)] text-[10px] text-white/40">
        {value.toFixed(1)}
      </span>
    </div>
  );
}

export function LightingEditor() {
  const lighting = useEditorStore((s) => s.scene.lighting);
  const dispatch = useEditorStore((s) => s.dispatch);

  const dirLight = lighting.directionalLights[0];

  const updateAmbient = useCallback(
    (changes: { color?: string; intensity?: number }) => {
      dispatch({
        type: "UPDATE_LIGHTING",
        lighting: {
          ambientLight: { ...lighting.ambientLight, ...changes },
        },
      });
    },
    [dispatch, lighting.ambientLight]
  );

  const updateDirectional = useCallback(
    (changes: {
      color?: string;
      intensity?: number;
      position?: [number, number, number];
      castShadow?: boolean;
    }) => {
      if (!dirLight) return;
      dispatch({
        type: "UPDATE_LIGHTING",
        lighting: {
          directionalLights: [{ ...dirLight, ...changes }],
        },
      });
    },
    [dispatch, dirLight]
  );

  // Compute height and angle from position for sliders
  const height = dirLight?.position[1] ?? 10;
  const angle = dirLight
    ? Math.atan2(dirLight.position[2], dirLight.position[0]) * (180 / Math.PI)
    : 45;

  const setHeightAndAngle = useCallback(
    (newHeight: number, newAngle: number) => {
      const rad = (newAngle * Math.PI) / 180;
      const radius = 5;
      updateDirectional({
        position: [
          Math.round(Math.cos(rad) * radius * 100) / 100,
          newHeight,
          Math.round(Math.sin(rad) * radius * 100) / 100,
        ],
      });
    },
    [updateDirectional]
  );

  return (
    <div>
      <div className="px-3 py-2">
        <span className="font-[family-name:var(--font-spline-sans)] text-[11px] font-semibold tracking-[0.3px] text-white/[0.95]">
          Lighting
        </span>
      </div>

      {/* Ambient section */}
      <div className="px-3 pb-1">
        <span className="font-[family-name:var(--font-spline-sans)] text-[10px] font-medium text-white/50">
          Ambient
        </span>
      </div>
      <div className="flex items-center gap-2 px-3 py-[3px]">
        <span className="w-[52px] shrink-0 font-[family-name:var(--font-spline-sans)] text-[11px] text-white/60">
          Color
        </span>
        <div className="relative h-5 w-5 shrink-0">
          <div
            className="h-5 w-5 rounded-[4px]"
            style={{ backgroundColor: lighting.ambientLight.color }}
          />
          <input
            type="color"
            value={lighting.ambientLight.color}
            onChange={(e) => updateAmbient({ color: e.target.value })}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
        </div>
        <span className="font-[family-name:var(--font-spline-sans)] text-[10px] text-white/40">
          {lighting.ambientLight.color}
        </span>
      </div>
      <LightingSlider
        label="Intensity"
        value={lighting.ambientLight.intensity}
        min={0}
        max={3}
        step={0.1}
        onChange={(v) => updateAmbient({ intensity: v })}
      />

      {/* Directional section */}
      {dirLight && (
        <>
          <div className="px-3 pb-1 pt-2">
            <span className="font-[family-name:var(--font-spline-sans)] text-[10px] font-medium text-white/50">
              Directional
            </span>
          </div>
          <div className="flex items-center gap-2 px-3 py-[3px]">
            <span className="w-[52px] shrink-0 font-[family-name:var(--font-spline-sans)] text-[11px] text-white/60">
              Color
            </span>
            <div className="relative h-5 w-5 shrink-0">
              <div
                className="h-5 w-5 rounded-[4px]"
                style={{ backgroundColor: dirLight.color }}
              />
              <input
                type="color"
                value={dirLight.color}
                onChange={(e) => updateDirectional({ color: e.target.value })}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
            </div>
            <span className="font-[family-name:var(--font-spline-sans)] text-[10px] text-white/40">
              {dirLight.color}
            </span>
          </div>
          <LightingSlider
            label="Intensity"
            value={dirLight.intensity}
            min={0}
            max={5}
            step={0.1}
            onChange={(v) => updateDirectional({ intensity: v })}
          />
          <LightingSlider
            label="Height"
            value={height}
            min={1}
            max={30}
            step={0.5}
            onChange={(v) => setHeightAndAngle(v, angle)}
          />
          <LightingSlider
            label="Angle"
            value={angle}
            min={-180}
            max={180}
            step={5}
            onChange={(v) => setHeightAndAngle(height, v)}
          />
          <div className="flex items-center gap-2 px-3 py-[3px]">
            <span className="w-[52px] shrink-0 font-[family-name:var(--font-spline-sans)] text-[11px] text-white/60">
              Shadow
            </span>
            <button
              type="button"
              onClick={() =>
                updateDirectional({ castShadow: !dirLight.castShadow })
              }
              className={`flex h-5 w-9 items-center rounded-full px-0.5 transition-colors ${
                dirLight.castShadow ? "bg-[#7CC4F8]/40" : "bg-white/10"
              }`}
            >
              <div
                className={`h-4 w-4 rounded-full bg-white transition-transform ${
                  dirLight.castShadow ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
