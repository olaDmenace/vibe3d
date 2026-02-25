"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useEditorStore } from "@/store/editor-store";
import { useAutoSave } from "@/hooks/use-auto-save";
import { EditorLayout } from "./editor-layout";
import type { SceneState } from "@/types/scene";

type ProjectData = {
  project: { id: string; name: string };
  scene: { id: string; scene_graph: SceneState; version: number };
};

export function EditorWithProject({ projectId }: { projectId: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projectName, setProjectName] = useState("Loading...");
  const router = useRouter();
  const loadScene = useEditorStore((s) => s.loadScene);
  const { markClean } = useAutoSave(projectId);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/projects/${projectId}`);
        if (!res.ok) {
          if (res.status === 401) {
            router.push("/sign-in");
            return;
          }
          if (res.status === 404) {
            setError("Project not found");
            return;
          }
          setError("Failed to load project");
          return;
        }

        const data: ProjectData = await res.json();
        setProjectName(data.project.name);

        // Hydrate the editor store with the saved scene
        const sceneGraph = data.scene.scene_graph as SceneState;
        loadScene(sceneGraph);
        markClean(sceneGraph);
        setLoading(false);
      } catch {
        setError("Failed to load project");
      }
    }

    load();
  }, [projectId, loadScene, markClean, router]);

  if (error) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center gap-4 bg-[#0d0d0d] text-[#e4e4e7]">
        <p className="text-lg text-red-400">{error}</p>
        <button
          onClick={() => router.push("/dashboard")}
          className="rounded-lg bg-[#6366f1] px-4 py-2 text-sm text-white hover:bg-[#818cf8]"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center gap-3 bg-[#0d0d0d] text-[#e4e4e7]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#6366f1] border-t-transparent" />
        <p className="text-sm text-[#71717a]">Loading {projectName}...</p>
      </div>
    );
  }

  return <EditorLayout projectId={projectId} projectName={projectName} />;
}
