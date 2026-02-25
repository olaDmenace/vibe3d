"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Plus, Trash2, LogOut, FolderOpen } from "lucide-react";
import type { Tables } from "@/types/database";

type Project = Tables<"projects">;

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    loadProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadProjects() {
    setLoading(true);
    const res = await fetch("/api/projects");
    if (res.ok) {
      const data = await res.json();
      setProjects(data);
    }
    setLoading(false);
  }

  async function createProject() {
    setCreating(true);
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Untitled Project" }),
    });
    if (res.ok) {
      const { project } = await res.json();
      router.push(`/editor/${project.id}`);
    }
    setCreating(false);
  }

  async function deleteProject(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm("Delete this project? This cannot be undone.")) return;

    await fetch(`/api/projects/${id}`, { method: "DELETE" });
    setProjects((prev) => prev.filter((p) => p.id !== id));
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/sign-in");
  }

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-[#e4e4e7]">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-[#2a2a2a] px-8 py-4">
        <h1 className="text-xl font-semibold">Vibe3D</h1>
        <button
          onClick={signOut}
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-[#71717a] transition-colors hover:bg-[#1a1a1a] hover:text-[#e4e4e7]"
        >
          <LogOut size={16} />
          Sign out
        </button>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-5xl px-8 py-12">
        <div className="mb-8 flex items-center justify-between">
          <h2 className="text-2xl font-semibold">Projects</h2>
          <button
            onClick={createProject}
            disabled={creating}
            className="flex items-center gap-2 rounded-lg bg-[#6366f1] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#818cf8] disabled:opacity-50"
          >
            <Plus size={16} />
            {creating ? "Creating..." : "New Project"}
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#6366f1] border-t-transparent" />
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#2a2a2a] py-24">
            <FolderOpen size={48} className="mb-4 text-[#52525b]" />
            <p className="mb-2 text-lg text-[#71717a]">No projects yet</p>
            <p className="mb-6 text-sm text-[#52525b]">
              Create your first project to get started.
            </p>
            <button
              onClick={createProject}
              disabled={creating}
              className="flex items-center gap-2 rounded-lg bg-[#6366f1] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#818cf8] disabled:opacity-50"
            >
              <Plus size={16} />
              New Project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <div
                key={project.id}
                onClick={() => router.push(`/editor/${project.id}`)}
                className="group cursor-pointer rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] p-4 transition-colors hover:border-[#3a3a3a] hover:bg-[#242424]"
              >
                {/* Thumbnail placeholder */}
                <div className="mb-3 flex h-32 items-center justify-center rounded-lg bg-[#111118]">
                  {project.thumbnail_url ? (
                    <img
                      src={project.thumbnail_url}
                      alt={project.name}
                      className="h-full w-full rounded-lg object-cover"
                    />
                  ) : (
                    <div className="text-3xl text-[#52525b]">
                      <FolderOpen size={32} />
                    </div>
                  )}
                </div>

                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-medium">
                      {project.name}
                    </h3>
                    <p className="mt-1 text-xs text-[#71717a]">
                      {new Date(project.updated_at!).toLocaleDateString(
                        undefined,
                        { month: "short", day: "numeric", year: "numeric" }
                      )}
                    </p>
                  </div>
                  <button
                    onClick={(e) => deleteProject(project.id, e)}
                    className="ml-2 rounded p-1 text-[#52525b] opacity-0 transition-all hover:bg-[#2a2a2a] hover:text-red-400 group-hover:opacity-100"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
