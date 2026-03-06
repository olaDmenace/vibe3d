"use client";

import { useState, useEffect } from "react";
import { useEditorStore } from "@/store/editor-store";
import { createClient } from "@/lib/supabase/client";
import { getSpawnPosition } from "@/lib/scene-utils";

interface ProjectAsset {
  id: string;
  name: string;
  storage_path: string;
  source: string;
  ai_prompt: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export function AssetLibraryPanel({ projectId }: { projectId: string }) {
  const [assets, setAssets] = useState<ProjectAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const dispatch = useEditorStore((s) => s.dispatch);

  useEffect(() => {
    async function loadAssets() {
      const supabase = createClient();
      const { data } = await supabase
        .from("assets")
        .select("id, name, storage_path, source, ai_prompt, metadata, created_at")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      setAssets((data as ProjectAsset[] | null) ?? []);
      setLoading(false);
    }
    loadAssets();
  }, [projectId]);

  function addAssetToScene(asset: ProjectAsset) {
    const supabase = createClient();
    supabase.storage
      .from("assets")
      .createSignedUrl(asset.storage_path, 3600)
      .then(({ data }: { data: { signedUrl: string } | null }) => {
        if (!data?.signedUrl) return;

        const spawnPos = getSpawnPosition(useEditorStore.getState().scene);
        const objId = crypto.randomUUID();

        dispatch({
          type: "ADD_OBJECT",
          id: objId,
          payload: {
            name: asset.name || "Asset",
            parentId: null,
            assetId: asset.id,
            visible: true,
            locked: false,
            transform: {
              position: spawnPos,
              rotation: [0, 0, 0],
              scale: [1, 1, 1],
            },
            materialOverrides: [],
            metadata: {
              modelUrl: data.signedUrl,
              meshNames: (asset.metadata?.meshNames as string[]) ?? [],
              meshCount: (asset.metadata?.meshCount as number) ?? 0,
            },
          },
        });

        dispatch({ type: "SELECT_OBJECT", id: objId });
      });
  }

  if (loading) {
    return (
      <div className="space-y-2 px-3 pb-2 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 bg-white/[0.03] rounded-lg" />
        ))}
      </div>
    );
  }

  if (assets.length === 0) {
    return (
      <div className="text-center py-4 px-3">
        <span className="font-[family-name:var(--font-spline-sans)] text-[10px] text-white/30">
          No assets yet — generate or upload models to see them here
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 px-3 pb-2">
      {assets.map((asset) => {
        const thumbnailUrl = asset.metadata?.thumbnailUrl as string | undefined;

        return (
          <button
            key={asset.id}
            className="w-full flex items-center gap-2.5 p-2 rounded-[8px] hover:bg-white/[0.06] transition-colors text-left"
            onClick={() => addAssetToScene(asset)}
            title={`Add "${asset.name}" to scene`}
          >
            {thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={thumbnailUrl}
                alt={asset.name}
                className="w-10 h-10 rounded-[4px] object-cover border border-white/[0.06] flex-shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-[4px] bg-white/[0.03] border border-white/[0.06] flex items-center justify-center flex-shrink-0">
                <span className="text-white/30 text-[10px] font-[family-name:var(--font-spline-sans)]">3D</span>
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-[11px] text-white/70 truncate font-[family-name:var(--font-spline-sans)]">
                {asset.name}
              </p>
              <p className="text-[10px] text-white/30 font-[family-name:var(--font-spline-sans)]">
                {asset.source === "ai_generated" ? "AI Generated" : "Uploaded"}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
