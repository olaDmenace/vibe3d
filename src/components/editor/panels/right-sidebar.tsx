"use client";

import { useEditorStore } from "@/store/editor-store";
import { useCallback, useMemo, useState } from "react";
import type { ExportFormat } from "@/lib/three/export-scene";
import { SharingModal } from "@/components/editor/sharing-modal";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Strip leading "#" from a hex colour string for display. */
function stripHash(hex: string): string {
  return hex.replace(/^#/, "");
}

/** Round to two decimal places for display. */
function fmt(n: number): string {
  return Number(n.toFixed(2)).toString();
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SectionHeader({
  label,
  weight = 500,
  actions,
}: {
  label: string;
  weight?: 500 | 600;
  actions?: React.ReactNode;
}) {
  const fw = weight === 600 ? "font-semibold tracking-[0.3px]" : "font-medium";
  return (
    <div className="flex items-center justify-between px-3 py-2">
      <span
        className={`font-[family-name:var(--font-spline-sans)] text-[11px] ${fw} text-white/[0.92]`}
      >
        {label}
      </span>
      {actions && <div className="flex items-center gap-1">{actions}</div>}
    </div>
  );
}

function SmallIconButton({ children }: { children: React.ReactNode }) {
  return (
    <button
      type="button"
      className="flex h-5 w-5 items-center justify-center rounded opacity-60 hover:opacity-100 transition-opacity"
    >
      {children}
    </button>
  );
}

/** Three-dot context menu icon (vertical). */
function DotsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="3.5" r="1" fill="currentColor" />
      <circle cx="8" cy="8" r="1" fill="currentColor" />
      <circle cx="8" cy="12.5" r="1" fill="currentColor" />
    </svg>
  );
}

/** Plus icon. */
function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        d="M8 3v10M3 8h10"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Expand / chevron-down icon for Transform section. */
function ExpandIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      className="opacity-50"
    >
      <path
        d="M4 6l4 4 4-4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Transform input row
// ---------------------------------------------------------------------------

function TransformRow({
  label,
  values,
  axes,
  onChange,
}: {
  label: string;
  values: number[];
  axes: string[];
  onChange: (idx: number, value: number) => void;
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-[3px]">
      <span className="w-[52px] shrink-0 font-[family-name:var(--font-spline-sans)] text-[11px] text-white/60">
        {label}
      </span>
      <div className="flex flex-1 items-center gap-1.5">
        {values.map((v, i) => (
          <div
            key={axes[i]}
            className="flex flex-1 items-center rounded-[8px] bg-white/[0.03] px-2"
            style={{ height: 24, minWidth: 0, maxWidth: 67 }}
          >
            <span className="mr-1 font-[family-name:var(--font-spline-sans)] text-[11px] font-medium text-[#10B981] tracking-[0.3px]">
              {axes[i]}
            </span>
            <input
              type="text"
              value={fmt(v)}
              onChange={(e) => {
                const parsed = parseFloat(e.target.value);
                if (!Number.isNaN(parsed)) onChange(i, parsed);
              }}
              className="w-full bg-transparent font-[family-name:var(--font-spline-sans)] text-[11px] text-white/70 tracking-[0.3px] outline-none"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Asset section (Color Assets, Image Assets, etc.)
// ---------------------------------------------------------------------------

function AssetSection({
  label,
  children,
}: {
  label: string;
  children?: React.ReactNode;
}) {
  return (
    <div>
      <SectionHeader
        label={label}
        actions={
          <>
            <SmallIconButton>
              <DotsIcon />
            </SmallIconButton>
            <SmallIconButton>
              <PlusIcon />
            </SmallIconButton>
          </>
        }
      />
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export function RightSidebar({ projectId }: { projectId?: string }) {
  const selectedObjectId = useEditorStore((s) => s.selectedObjectId);
  const scene = useEditorStore((s) => s.scene);
  const dispatch = useEditorStore((s) => s.dispatch);
  const [exporting, setExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>("glb");
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const selectedObject = selectedObjectId
    ? scene.objects[selectedObjectId] ?? null
    : null;

  const bgColor = scene.environment.backgroundColor;

  // --- Transform change handlers -------------------------------------------

  const handlePositionChange = useCallback(
    (idx: number, value: number) => {
      if (!selectedObject) return;
      const pos: [number, number, number] = [
        ...selectedObject.transform.position,
      ] as [number, number, number];
      pos[idx] = value;
      dispatch({
        type: "TRANSFORM_OBJECT",
        id: selectedObject.id,
        transform: { position: pos },
      });
    },
    [selectedObject, dispatch]
  );

  const handleRotationChange = useCallback(
    (idx: number, value: number) => {
      if (!selectedObject) return;
      const rot: [number, number, number] = [
        ...selectedObject.transform.rotation,
      ] as [number, number, number];
      rot[idx] = value;
      dispatch({
        type: "TRANSFORM_OBJECT",
        id: selectedObject.id,
        transform: { rotation: rot },
      });
    },
    [selectedObject, dispatch]
  );

  const handleScaleChange = useCallback(
    (idx: number, value: number) => {
      if (!selectedObject) return;
      const scl: [number, number, number] = [
        ...selectedObject.transform.scale,
      ] as [number, number, number];
      scl[idx] = value;
      dispatch({
        type: "TRANSFORM_OBJECT",
        id: selectedObject.id,
        transform: { scale: scl },
      });
    },
    [selectedObject, dispatch]
  );

  // --- Derived transform values --------------------------------------------

  const position = selectedObject?.transform.position ?? [0, 0, 0];
  const rotation = selectedObject?.transform.rotation ?? [0, 0, 0];
  const scale = selectedObject?.transform.scale ?? [1, 1, 1];

  // --- Dynamic color assets from scene objects' materials ------------------

  const colorAssets = useMemo(() => {
    const colors = new Map<string, string>(); // hex → name
    for (const obj of Object.values(scene.objects)) {
      if (obj.materialOverrides) {
        for (const mat of obj.materialOverrides) {
          if (mat.color && !colors.has(mat.color)) {
            colors.set(mat.color, obj.name);
          }
        }
      }
    }
    if (colors.size === 0) {
      colors.set("#808080", "Default Color");
    }
    return Array.from(colors.entries()).map(([hex, name]) => ({ hex, name }));
  }, [scene.objects]);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div
      className="fixed right-4 top-4 z-50 flex w-[230px] flex-col rounded-[20px] border border-white/[0.15] bg-[#1F1F18]"
      style={{ backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" }}
    >
      {/* ----------------------------------------------------------------- */}
      {/* Top button row                                                    */}
      {/* ----------------------------------------------------------------- */}
      <div className="flex items-center gap-1.5 p-2" style={{ height: 49 }}>
        <button
          type="button"
          onClick={() => projectId && setShareOpen(true)}
          className="flex h-8 flex-1 items-center justify-center rounded-[14px] bg-white/[0.08] font-[family-name:var(--font-spline-sans)] text-[11px] font-medium text-white/70 transition-colors hover:bg-white/[0.12]"
          style={{
            boxShadow:
              "0px 2px 8px rgba(0,0,0,0.1), inset 0px 1px 0px rgba(255,255,255,0.1)",
          }}
        >
          Share
        </button>
        <div className="relative flex-1">
          <button
            type="button"
            disabled={exporting}
            onClick={() => setShowExportMenu((prev) => !prev)}
            className="flex h-8 w-full items-center justify-center gap-1 rounded-[14px] bg-white/[0.08] font-[family-name:var(--font-spline-sans)] text-[11px] font-normal text-white/70 transition-colors hover:bg-white/[0.12] disabled:opacity-50"
            style={{
              boxShadow:
                "0px 2px 8px rgba(0,0,0,0.1), inset 0px 1px 0px rgba(255,255,255,0.1)",
            }}
          >
            {exporting ? "Exporting..." : `Export .${exportFormat}`}
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M2.5 4L5 6.5L7.5 4" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
            </svg>
          </button>
          {showExportMenu && (
            <div className="absolute right-0 top-9 z-50 w-full overflow-hidden rounded-[10px] border border-white/[0.1] bg-[#1F1F18]">
              {(["glb", "obj", "stl"] as const).map((fmt) => (
                <button
                  key={fmt}
                  type="button"
                  onClick={async () => {
                    setExportFormat(fmt);
                    setShowExportMenu(false);
                    setExporting(true);
                    try {
                      const { exportScene, downloadBlob, getExtension } = await import("@/lib/three/export-scene");
                      const blob = await exportScene(scene, fmt);
                      downloadBlob(blob, `scene.${getExtension(fmt)}`);
                    } catch (err) {
                      console.error("Export failed:", err);
                    } finally {
                      setExporting(false);
                    }
                  }}
                  className="flex w-full items-center px-3 py-2 text-left font-[family-name:var(--font-spline-sans)] text-[11px] text-white/70 transition-colors hover:bg-white/[0.06]"
                >
                  .{fmt.toUpperCase()}
                  {fmt === exportFormat && (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="ml-auto">
                      <path d="M2.5 6.5L5 9L9.5 3.5" stroke="#7CC4F8" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Scrollable content                                                */}
      {/* ----------------------------------------------------------------- */}
      <div className="overflow-y-auto">
        {/* ----- Page section ----- */}
        <div style={{ height: 96 }}>
          <div className="px-3 pt-4">
            <span className="font-[family-name:var(--font-spline-sans)] text-[11px] font-medium text-white/[0.92]">
              Page
            </span>
          </div>

          {/* BG Color row */}
          <div className="mt-2 flex items-center gap-2 px-3">
            <span className="shrink-0 font-[family-name:var(--font-spline-sans)] text-[11px] text-white/[0.52]">
              BG Color
            </span>
            {/* Color swatch */}
            <div
              className="h-6 w-6 shrink-0 rounded-[8px]"
              style={{
                backgroundColor: bgColor,
                boxShadow: "inset 0px 0px 0px 1px rgba(255,255,255,0.05)",
              }}
            />
            {/* Hex input */}
            <div className="flex h-6 flex-1 items-center rounded-[8px] bg-white/[0.05] px-2">
              <input
                type="text"
                value={stripHash(bgColor)}
                onChange={(e) => {
                  const hex = e.target.value.replace(/[^0-9a-fA-F]/g, "").slice(0, 6);
                  if (hex.length === 6) {
                    dispatch({
                      type: "UPDATE_ENVIRONMENT",
                      environment: { backgroundColor: `#${hex}` },
                    });
                  }
                }}
                className="w-full bg-transparent font-[family-name:var(--font-spline-sans)] text-[11px] text-white/70 outline-none"
              />
            </div>
            {/* Opacity display */}
            <div className="flex h-6 w-[42px] shrink-0 items-center justify-center rounded-[8px] bg-white/[0.05]">
              <span className="font-[family-name:var(--font-spline-sans)] text-[11px] text-white/70">
                100%
              </span>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="mx-3 border-t border-white/[0.06]" />

        {/* ----- Transform section ----- */}
        <div style={{ minHeight: 145 }}>
          <div className="flex items-center justify-between px-3 py-2">
            <span className="font-[family-name:var(--font-spline-sans)] text-[11px] font-semibold tracking-[0.3px] text-white/[0.95]">
              Transform
            </span>
            <ExpandIcon />
          </div>

          <TransformRow
            label="Position"
            values={[position[0], position[1], position[2]]}
            axes={["x", "y", "z"]}
            onChange={handlePositionChange}
          />
          <TransformRow
            label="Rotation"
            values={[rotation[0], rotation[1], rotation[2]]}
            axes={["x", "y", "z"]}
            onChange={handleRotationChange}
          />
          <TransformRow
            label="Scale"
            values={[scale[0], scale[1], scale[2]]}
            axes={["x", "y", "z"]}
            onChange={handleScaleChange}
          />
        </div>

        {/* Divider */}
        <div className="mx-3 border-t border-white/[0.06]" />

        {/* ----- Color Assets section ----- */}
        <AssetSection label="Color Assets">
          <div className="flex flex-col gap-1 px-3 pb-2">
            {colorAssets.map(({ hex, name }) => (
              <div
                key={hex}
                className="flex h-8 items-center gap-2 rounded-[8px] bg-white/[0.05] px-2"
              >
                <div
                  className="h-4 w-4 shrink-0 rounded-[4px]"
                  style={{ backgroundColor: hex }}
                />
                <span className="font-[family-name:var(--font-spline-sans)] text-[11px] text-white/70">
                  {name}
                </span>
              </div>
            ))}
          </div>
        </AssetSection>

        {/* Divider */}
        <div className="mx-3 border-t border-white/[0.06]" />

        {/* ----- Image Assets section ----- */}
        <AssetSection label="Image Assets" />

        {/* Divider */}
        <div className="mx-3 border-t border-white/[0.06]" />

        {/* ----- Media Assets section ----- */}
        <AssetSection label="Media Assets" />

        {/* Divider */}
        <div className="mx-3 border-t border-white/[0.06]" />

        {/* ----- Audio Assets section ----- */}
        <AssetSection label="Audio Assets" />
      </div>

      {/* Sharing Modal */}
      {projectId && (
        <SharingModal
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          projectId={projectId}
        />
      )}
    </div>
  );
}
