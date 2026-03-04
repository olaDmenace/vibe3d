"use client";

import { useEditorStore } from "@/store/editor-store";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ExportFormat } from "@/lib/three/export-scene";
import type { EditorAction } from "@/types/actions";
import { SharingModal } from "@/components/editor/sharing-modal";
import { MeshPartsPanel } from "./mesh-parts-panel";
import { MaterialEditor } from "./material-editor";

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
// Transform input cell — uses local state to avoid reformatting while typing
// ---------------------------------------------------------------------------

function TransformCell({
  axis,
  value,
  onChange,
  step = 0.1,
}: {
  axis: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
}) {
  const [local, setLocal] = useState(fmt(value));
  const focusedRef = useRef(false);
  const valueRef = useRef(value);
  valueRef.current = value;

  // Sync from store when not focused
  useEffect(() => {
    if (!focusedRef.current) setLocal(fmt(value));
  }, [value]);

  return (
    <div
      className="flex flex-1 items-center rounded-[8px] bg-white/[0.03] px-2"
      style={{ height: 24, minWidth: 0, maxWidth: 67 }}
    >
      <span className="mr-1 font-[family-name:var(--font-spline-sans)] text-[11px] font-medium text-[#10B981] tracking-[0.3px]">
        {axis}
      </span>
      <input
        type="text"
        value={local}
        onFocus={() => { focusedRef.current = true; }}
        onBlur={() => {
          focusedRef.current = false;
          const parsed = parseFloat(local);
          if (!Number.isNaN(parsed)) {
            onChange(parsed);
          } else {
            setLocal(fmt(valueRef.current));
          }
        }}
        onChange={(e) => setLocal(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            const parsed = parseFloat(local);
            if (!Number.isNaN(parsed)) {
              onChange(parsed);
              // Blur after committing so the effect will sync
              (e.target as HTMLInputElement).blur();
            }
          }
          if (e.key === "ArrowUp") { e.preventDefault(); onChange(valueRef.current + step); }
          if (e.key === "ArrowDown") { e.preventDefault(); onChange(valueRef.current - step); }
        }}
        className="w-full bg-transparent font-[family-name:var(--font-spline-sans)] text-[11px] text-white/70 tracking-[0.3px] outline-none"
      />
    </div>
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
  step,
}: {
  label: string;
  values: number[];
  axes: string[];
  onChange: (idx: number, value: number) => void;
  step?: number;
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-[3px]">
      <span className="w-[52px] shrink-0 font-[family-name:var(--font-spline-sans)] text-[11px] text-white/60">
        {label}
      </span>
      <div className="flex flex-1 items-center gap-1.5">
        {values.map((v, i) => (
          <TransformCell
            key={axes[i]}
            axis={axes[i]}
            value={v}
            onChange={(newVal) => onChange(i, newVal)}
            step={step}
          />
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
  defaultExpanded = false,
  onAdd,
}: {
  label: string;
  children?: React.ReactNode;
  defaultExpanded?: boolean;
  onAdd?: () => void;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div>
      <div className="flex items-center justify-between px-3 py-2">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 transition-opacity hover:opacity-80"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            className="opacity-50"
            style={{
              transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
              transition: "transform 150ms ease",
            }}
          >
            <path
              d="M6 4L10 8L6 12"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="font-[family-name:var(--font-spline-sans)] text-[11px] font-medium text-white/[0.92]">
            {label}
          </span>
        </button>
        <div className="flex items-center gap-1">
          {onAdd && (
            <SmallIconButton>
              <button onClick={onAdd}><PlusIcon /></button>
            </SmallIconButton>
          )}
        </div>
      </div>
      {expanded && children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// BG Color hex input — local state to avoid cursor issues
// ---------------------------------------------------------------------------

function BgColorHexInput({
  bgColor,
  dispatch,
}: {
  bgColor: string;
  dispatch: (action: EditorAction) => void;
}) {
  const [local, setLocal] = useState(stripHash(bgColor));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setLocal(stripHash(bgColor));
  }, [bgColor, focused]);

  return (
    <input
      type="text"
      value={local}
      onFocus={() => setFocused(true)}
      onBlur={() => {
        setFocused(false);
        const hex = local.replace(/[^0-9a-fA-F]/g, "").slice(0, 6);
        if (hex.length === 6) {
          dispatch({
            type: "UPDATE_ENVIRONMENT",
            environment: { backgroundColor: `#${hex}` },
          });
        } else {
          setLocal(stripHash(bgColor));
        }
      }}
      onChange={(e) => setLocal(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
      }}
      maxLength={6}
      className="w-full bg-transparent font-[family-name:var(--font-spline-sans)] text-[11px] text-white/70 outline-none"
    />
  );
}

// ---------------------------------------------------------------------------
// Editable color asset row — click swatch to pick, updates material
// ---------------------------------------------------------------------------

function ColorAssetRow({
  hex,
  objectName,
  objectId,
  materialIndex,
}: {
  hex: string;
  objectName: string;
  objectId: string;
  materialIndex: number;
}) {
  const dispatch = useEditorStore((s) => s.dispatch);
  const objects = useEditorStore((s) => s.scene.objects);
  const obj = objects[objectId];

  return (
    <div className="flex h-8 items-center gap-2 rounded-[8px] bg-white/[0.05] px-2">
      {/* Clickable color swatch with native picker */}
      <div className="relative h-4 w-4 shrink-0">
        <div
          className="h-4 w-4 rounded-[4px]"
          style={{ backgroundColor: hex }}
        />
        <input
          type="color"
          value={hex}
          onChange={(e) => {
            if (!obj) return;
            const mat = obj.materialOverrides[materialIndex] ?? {
              materialIndex,
              color: hex,
              roughness: 0.5,
              metalness: 0,
              opacity: 1,
            };
            dispatch({
              type: "UPDATE_MATERIAL",
              id: objectId,
              overrides: [{ ...mat, color: e.target.value }],
            });
          }}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          title={`Change color for ${objectName}`}
        />
      </div>
      <span className="flex-1 truncate font-[family-name:var(--font-spline-sans)] text-[11px] text-white/70">
        {objectName}
      </span>
      <span className="shrink-0 font-[family-name:var(--font-spline-sans)] text-[10px] text-white/40">
        {hex}
      </span>
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
  const highlightedMeshName = useEditorStore((s) => s.highlightedMeshName);

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
    const result: { hex: string; name: string; objectId: string; materialIndex: number }[] = [];
    const seen = new Set<string>();
    for (const obj of Object.values(scene.objects)) {
      if (obj.materialOverrides) {
        for (const mat of obj.materialOverrides) {
          const key = `${obj.id}:${mat.materialIndex}`;
          if (mat.color && !seen.has(key)) {
            seen.add(key);
            result.push({ hex: mat.color, name: obj.name, objectId: obj.id, materialIndex: mat.materialIndex });
          }
        }
      }
    }
    return result;
  }, [scene.objects]);

  // --- Image assets (generated models with thumbnails) -------------------

  const imageAssets = useMemo(() => {
    const result: { id: string; name: string; thumbnailUrl?: string }[] = [];
    for (const obj of Object.values(scene.objects)) {
      const thumb = obj.metadata?.thumbnailUrl as string | undefined;
      if (thumb) {
        result.push({ id: obj.id, name: obj.name, thumbnailUrl: thumb });
      }
    }
    return result;
  }, [scene.objects]);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div
      className="fixed right-4 top-4 bottom-4 z-50 flex w-[230px] flex-col rounded-[20px] border border-white/[0.15] bg-[#1F1F18]"
      style={{ backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", maxHeight: "calc(100vh - 32px)" }}
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
            {/* Color swatch — click to open native picker */}
            <div className="relative h-6 w-6 shrink-0">
              <div
                className="h-6 w-6 rounded-[8px]"
                style={{
                  backgroundColor: bgColor,
                  boxShadow: "inset 0px 0px 0px 1px rgba(255,255,255,0.05)",
                }}
              />
              <input
                type="color"
                value={bgColor}
                onChange={(e) => {
                  dispatch({
                    type: "UPDATE_ENVIRONMENT",
                    environment: { backgroundColor: e.target.value },
                  });
                }}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                title="Pick background color"
              />
            </div>
            {/* Hex input */}
            <div className="flex h-6 flex-1 items-center rounded-[8px] bg-white/[0.05] px-2">
              <BgColorHexInput bgColor={bgColor} dispatch={dispatch} />
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

        {/* ----- Mesh Parts section (for generated models with 2+ meshes) ----- */}
        {selectedObject && (
          <>
            <MeshPartsPanel object={selectedObject} />
            <div className="mx-3 border-t border-white/[0.06]" />
          </>
        )}

        {/* ----- Material Editor section ----- */}
        {selectedObject && (
          <>
            <MaterialEditor object={selectedObject} meshName={highlightedMeshName} />
            <div className="mx-3 border-t border-white/[0.06]" />
          </>
        )}

        {/* ----- Color Assets section ----- */}
        <AssetSection label="Color Assets" defaultExpanded={colorAssets.length > 0}>
          <div className="flex flex-col gap-1 px-3 pb-2">
            {colorAssets.length > 0 ? (
              colorAssets.map((asset) => (
                <ColorAssetRow
                  key={`${asset.objectId}:${asset.materialIndex}`}
                  hex={asset.hex}
                  objectName={asset.name}
                  objectId={asset.objectId}
                  materialIndex={asset.materialIndex}
                />
              ))
            ) : (
              <span className="py-2 text-center font-[family-name:var(--font-spline-sans)] text-[10px] text-white/30">
                No colors in scene
              </span>
            )}
          </div>
        </AssetSection>

        {/* Divider */}
        <div className="mx-3 border-t border-white/[0.06]" />

        {/* ----- Image Assets section ----- */}
        <AssetSection label="Image Assets" defaultExpanded={imageAssets.length > 0}>
          <div className="flex flex-col gap-1 px-3 pb-2">
            {imageAssets.length > 0 ? (
              imageAssets.map((asset) => (
                <button
                  key={asset.id}
                  onClick={() => dispatch({ type: "SELECT_OBJECT", id: asset.id })}
                  className="flex h-10 w-full items-center gap-2 rounded-[8px] bg-white/[0.05] px-2 text-left transition-colors hover:bg-white/[0.08]"
                >
                  {asset.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={asset.thumbnailUrl}
                      alt={asset.name}
                      className="h-7 w-7 shrink-0 rounded-[4px] object-cover"
                    />
                  ) : (
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[4px] bg-white/[0.06]">
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <rect x="1" y="1" width="12" height="12" rx="2" stroke="white" strokeOpacity="0.2" strokeWidth="1" />
                        <circle cx="5" cy="5" r="1.5" fill="white" fillOpacity="0.2" />
                        <path d="M1 10L4.5 6.5L7 9L9 7L13 11" stroke="white" strokeOpacity="0.2" strokeWidth="1" />
                      </svg>
                    </div>
                  )}
                  <span className="flex-1 truncate font-[family-name:var(--font-spline-sans)] text-[11px] text-white/70">
                    {asset.name}
                  </span>
                </button>
              ))
            ) : (
              <span className="py-2 text-center font-[family-name:var(--font-spline-sans)] text-[10px] text-white/30">
                No images in scene
              </span>
            )}
          </div>
        </AssetSection>

        {/* Divider */}
        <div className="mx-3 border-t border-white/[0.06]" />

        {/* ----- Media Assets section ----- */}
        <AssetSection label="Media Assets">
          <div className="flex flex-col gap-1 px-3 pb-2">
            <span className="py-2 text-center font-[family-name:var(--font-spline-sans)] text-[10px] text-white/30">
              No media assets
            </span>
          </div>
        </AssetSection>

        {/* Divider */}
        <div className="mx-3 border-t border-white/[0.06]" />

        {/* ----- Audio Assets section ----- */}
        <AssetSection label="Audio Assets">
          <div className="flex flex-col gap-1 px-3 pb-2">
            <span className="py-2 text-center font-[family-name:var(--font-spline-sans)] text-[10px] text-white/30">
              No audio assets
            </span>
          </div>
        </AssetSection>
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
