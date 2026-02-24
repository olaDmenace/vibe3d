"use client";

import { useEditorStore } from "@/store/editor-store";
import { useCallback, useEffect, useState } from "react";

export function PropertiesPanel() {
  const selectedObjectId = useEditorStore((s) => s.selectedObjectId);
  const objects = useEditorStore((s) => s.scene.objects);
  const dispatch = useEditorStore((s) => s.dispatch);

  const selectedObject = selectedObjectId
    ? objects[selectedObjectId]
    : null;

  if (!selectedObject) {
    return (
      <div className="flex h-full flex-col">
        <div className="border-b border-editor-border px-3 py-2">
          <h3 className="text-xs font-medium tracking-wide text-editor-text-muted uppercase">
            Properties
          </h3>
        </div>
        <div className="flex flex-1 items-center justify-center px-3 text-center text-xs text-editor-text-dim">
          Select an object to edit its properties.
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-editor-border px-3 py-2">
        <h3 className="text-xs font-medium tracking-wide text-editor-text-muted uppercase">
          Properties
        </h3>
      </div>
      <div className="flex-1 space-y-0 overflow-y-auto">
        {/* Name */}
        <PropertySection title="Name">
          <NameInput
            objectId={selectedObject.id}
            name={selectedObject.name}
          />
        </PropertySection>

        {/* Transform */}
        <PropertySection title="Transform">
          <Vector3Input
            label="Position"
            value={selectedObject.transform.position}
            onChange={(position) =>
              dispatch({
                type: "TRANSFORM_OBJECT",
                id: selectedObject.id,
                transform: { position },
              })
            }
          />
          <Vector3Input
            label="Rotation"
            value={selectedObject.transform.rotation.map(
              (v) => (v * 180) / Math.PI
            ) as [number, number, number]}
            onChange={(rotation) =>
              dispatch({
                type: "TRANSFORM_OBJECT",
                id: selectedObject.id,
                transform: {
                  rotation: rotation.map(
                    (v) => (v * Math.PI) / 180
                  ) as [number, number, number],
                },
              })
            }
            step={1}
          />
          <Vector3Input
            label="Scale"
            value={selectedObject.transform.scale}
            onChange={(scale) =>
              dispatch({
                type: "TRANSFORM_OBJECT",
                id: selectedObject.id,
                transform: { scale },
              })
            }
            step={0.1}
          />
        </PropertySection>

        {/* Material */}
        <PropertySection title="Material">
          <MaterialEditor
            objectId={selectedObject.id}
            overrides={selectedObject.materialOverrides}
          />
        </PropertySection>
      </div>
    </div>
  );
}

function PropertySection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-editor-border-subtle px-3 py-2.5">
      <h4 className="mb-2 text-[10px] font-medium tracking-wider text-editor-text-dim uppercase">
        {title}
      </h4>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function NameInput({
  objectId,
  name,
}: {
  objectId: string;
  name: string;
}) {
  const dispatch = useEditorStore((s) => s.dispatch);
  const [value, setValue] = useState(name);

  useEffect(() => {
    setValue(name);
  }, [name]);

  return (
    <input
      type="text"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => {
        if (value !== name) {
          dispatch({ type: "RENAME_OBJECT", id: objectId, name: value });
        }
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          (e.target as HTMLInputElement).blur();
        }
      }}
      className="h-7 w-full rounded border border-editor-border bg-editor-bg px-2 text-xs text-editor-text outline-none focus:border-editor-accent"
    />
  );
}

function Vector3Input({
  label,
  value,
  onChange,
  step = 0.1,
}: {
  label: string;
  value: [number, number, number];
  onChange: (v: [number, number, number]) => void;
  step?: number;
}) {
  const labels = ["X", "Y", "Z"];
  const colors = ["text-red-400", "text-green-400", "text-blue-400"];

  return (
    <div className="flex items-center gap-1.5">
      <span className="w-14 text-[10px] text-editor-text-dim">{label}</span>
      {value.map((v, i) => (
        <div key={i} className="flex flex-1 items-center">
          <span className={`mr-1 text-[10px] ${colors[i]}`}>{labels[i]}</span>
          <NumberInput
            value={v}
            step={step}
            onChange={(newVal) => {
              const newVec = [...value] as [number, number, number];
              newVec[i] = newVal;
              onChange(newVec);
            }}
          />
        </div>
      ))}
    </div>
  );
}

function NumberInput({
  value,
  onChange,
  step = 0.1,
}: {
  value: number;
  onChange: (v: number) => void;
  step?: number;
}) {
  const [localValue, setLocalValue] = useState(String(Math.round(value * 100) / 100));

  useEffect(() => {
    setLocalValue(String(Math.round(value * 100) / 100));
  }, [value]);

  const commit = useCallback(() => {
    const parsed = parseFloat(localValue);
    if (!isNaN(parsed) && parsed !== value) {
      onChange(parsed);
    } else {
      setLocalValue(String(Math.round(value * 100) / 100));
    }
  }, [localValue, value, onChange]);

  return (
    <input
      type="text"
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        if (e.key === "ArrowUp") {
          e.preventDefault();
          onChange(value + step);
        }
        if (e.key === "ArrowDown") {
          e.preventDefault();
          onChange(value - step);
        }
      }}
      className="h-6 w-full rounded border border-editor-border bg-editor-bg px-1.5 text-center text-[11px] text-editor-text outline-none focus:border-editor-accent"
    />
  );
}

function MaterialEditor({
  objectId,
  overrides,
}: {
  objectId: string;
  overrides: { materialIndex: number; color?: string; roughness?: number; metalness?: number; opacity?: number }[];
}) {
  const dispatch = useEditorStore((s) => s.dispatch);
  const mat = overrides[0] ?? {
    materialIndex: 0,
    color: "#888888",
    roughness: 0.5,
    metalness: 0,
    opacity: 1,
  };

  const update = (changes: Partial<typeof mat>) => {
    dispatch({
      type: "UPDATE_MATERIAL",
      id: objectId,
      overrides: [{ ...mat, ...changes }],
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="w-14 text-[10px] text-editor-text-dim">Color</span>
        <input
          type="color"
          value={mat.color ?? "#888888"}
          onChange={(e) => update({ color: e.target.value })}
          className="h-6 w-8 cursor-pointer rounded border border-editor-border bg-transparent"
        />
        <span className="text-[10px] text-editor-text-muted">
          {mat.color ?? "#888888"}
        </span>
      </div>
      <SliderInput
        label="Roughness"
        value={mat.roughness ?? 0.5}
        onChange={(v) => update({ roughness: v })}
      />
      <SliderInput
        label="Metalness"
        value={mat.metalness ?? 0}
        onChange={(v) => update({ metalness: v })}
      />
      <SliderInput
        label="Opacity"
        value={mat.opacity ?? 1}
        onChange={(v) => update({ opacity: v })}
      />
    </div>
  );
}

function SliderInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-14 text-[10px] text-editor-text-dim">{label}</span>
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-editor-border accent-editor-accent"
      />
      <span className="w-7 text-right text-[10px] text-editor-text-muted">
        {Math.round(value * 100)}%
      </span>
    </div>
  );
}
