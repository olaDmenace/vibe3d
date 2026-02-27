"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { Trash2, RotateCcw } from "lucide-react";

interface TrashedProject {
  id: string;
  name: string;
  deleted_at: string;
  thumbnail_url: string | null;
}

interface TrashSectionProps {
  open: boolean;
  onClose: () => void;
}

export function TrashSection({ open, onClose }: TrashSectionProps) {
  const [projects, setProjects] = useState<TrashedProject[]>([]);
  const [loading, setLoading] = useState(false);

  const loadTrashed = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/projects/trash");
      if (res.ok) {
        const data = await res.json();
        setProjects(data.data ?? []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) loadTrashed();
  }, [open, loadTrashed]);

  const handleRestore = async (id: string) => {
    await fetch(`/api/projects/${id}/restore`, { method: "POST" });
    setProjects((prev) => prev.filter((p) => p.id !== id));
  };

  const handlePermanentDelete = async (id: string) => {
    if (!confirm("Permanently delete this project? This cannot be undone.")) return;
    await fetch(`/api/projects/${id}/permanent`, { method: "DELETE" });
    setProjects((prev) => prev.filter((p) => p.id !== id));
  };

  function formatDeletedAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return "Deleted today";
    if (days === 1) return "Deleted yesterday";
    return `Deleted ${days} days ago`;
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="flex flex-col overflow-hidden"
        style={{
          width: 560,
          maxHeight: "80vh",
          background: "var(--card-bg)",
          border: "1px solid var(--border-strong)",
          borderRadius: 16,
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
          <div className="flex items-center gap-2">
            <Trash2 size={16} className="text-white/50" />
            <span style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)" }}>Trash</span>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md transition-colors hover:bg-white/5"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M3 3L11 11M11 3L3 11" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-white/60" />
            </div>
          ) : projects.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12">
              <Trash2 size={32} className="text-white/20" />
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>
                Trash is empty
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {/* Auto-purge note */}
              {/* TODO: Cron job to permanently delete projects older than 30 days in trash */}
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 8 }}>
                Trashed projects will be kept for 30 days before permanent deletion.
              </p>

              {projects.map((project) => (
                <div
                  key={project.id}
                  className="flex items-center gap-3 rounded-lg px-3 py-3"
                  style={{ background: "var(--card-bg-secondary)", border: "1px solid var(--border-subtle)" }}
                >
                  {/* Thumbnail */}
                  <div className="h-[36px] w-[54px] shrink-0 overflow-hidden rounded-md bg-[var(--card-bg)]">
                    {project.thumbnail_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={project.thumbnail_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Image src="/assets/icons/dashboard-3d-view.svg" alt="" width={14} height={14} className="opacity-30" />
                      </div>
                    )}
                  </div>

                  {/* Name + deleted date */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] text-white/80">{project.name}</p>
                    <p className="text-[10px] text-white/40">{formatDeletedAgo(project.deleted_at)}</p>
                  </div>

                  {/* Restore button */}
                  <button
                    onClick={() => handleRestore(project.id)}
                    className="flex h-7 items-center gap-1.5 rounded-md px-3 text-[11px] text-white/60 transition-colors hover:bg-white/5 hover:text-white/80"
                    style={{ border: "1px solid #3A3A3A" }}
                  >
                    <RotateCcw size={12} />
                    Restore
                  </button>

                  {/* Permanent delete */}
                  <button
                    onClick={() => handlePermanentDelete(project.id)}
                    className="flex h-7 items-center gap-1.5 rounded-md px-3 text-[11px] text-red-400/70 transition-colors hover:bg-red-400/10 hover:text-red-400"
                    style={{ border: "1px solid rgba(239,68,68,0.2)" }}
                  >
                    <Trash2 size={12} />
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
