"use client";

import { useState, useEffect, useCallback } from "react";

interface Share {
  id: string;
  permission: string;
  created_at: string | null;
  shared_with_id: string;
  profiles: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
}

interface SharingModalProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function SharingModal({ open, onClose, projectId }: SharingModalProps) {
  const [shares, setShares] = useState<Share[]>([]);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [permission, setPermission] = useState<"view" | "edit" | "admin">("view");
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState("");

  const loadShares = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/shares`);
      if (res.ok) {
        const data = await res.json();
        setShares(data.shares ?? []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (open) {
      loadShares();
      setError("");
      setEmail("");
    }
  }, [open, loadShares]);

  const handleInvite = async () => {
    if (!email.trim()) return;
    setInviting(true);
    setError("");
    try {
      const res = await fetch(`/api/projects/${projectId}/shares`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), permission }),
      });
      const data = await res.json();
      if (res.ok) {
        setEmail("");
        loadShares();
      } else {
        setError(data.error || "Failed to invite");
      }
    } catch {
      setError("Failed to invite collaborator");
    } finally {
      setInviting(false);
    }
  };

  const handleRemove = async (shareId: string) => {
    if (!confirm("Remove this collaborator?")) return;
    await fetch(`/api/projects/${projectId}/shares/${shareId}`, { method: "DELETE" });
    setShares((prev) => prev.filter((s) => s.id !== shareId));
  };

  const handlePermissionChange = async (shareId: string, newPerm: string) => {
    await fetch(`/api/projects/${projectId}/shares/${shareId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ permission: newPerm }),
    });
    setShares((prev) =>
      prev.map((s) => (s.id === shareId ? { ...s, permission: newPerm } : s))
    );
  };

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
          width: 460,
          maxHeight: "80vh",
          background: "#1E1E1E",
          border: "1px solid #3A3A3A",
          borderRadius: 16,
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid #2A2A2A" }}>
          <span style={{ fontSize: 16, fontWeight: 600, color: "#E5E5E5" }}>Share Project</span>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md transition-colors hover:bg-white/5"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M3 3L11 11M11 3L3 11" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Invite form */}
        <div className="flex flex-col gap-3 px-6 py-4">
          <div className="flex items-center gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter email address"
              onKeyDown={(e) => { if (e.key === "Enter") handleInvite(); }}
              className="h-9 flex-1 rounded-lg bg-white/5 px-3 text-[12px] text-white/80 placeholder:text-white/30 outline-none"
              style={{ border: "1px solid #3A3A3A" }}
            />
            <select
              value={permission}
              onChange={(e) => setPermission(e.target.value as "view" | "edit" | "admin")}
              className="h-9 rounded-lg bg-white/5 px-2 text-[11px] text-white/70 outline-none"
              style={{ border: "1px solid #3A3A3A" }}
            >
              <option value="view">View</option>
              <option value="edit">Edit</option>
              <option value="admin">Admin</option>
            </select>
            <button
              onClick={handleInvite}
              disabled={inviting || !email.trim()}
              className="flex h-9 items-center justify-center rounded-lg px-4 text-[12px] font-medium text-black transition-colors hover:opacity-90 disabled:opacity-40"
              style={{ background: "#FAF9F5" }}
            >
              {inviting ? "Inviting..." : "Invite"}
            </button>
          </div>
          {error && (
            <span style={{ fontSize: 11, color: "#EF4444" }}>{error}</span>
          )}
        </div>

        {/* Collaborators list */}
        <div className="flex-1 overflow-y-auto px-6 pb-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white/60" />
            </div>
          ) : shares.length === 0 ? (
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", textAlign: "center", padding: "24px 0" }}>
              No collaborators yet
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {shares.map((share) => {
                const name = share.profiles?.display_name || "Unknown User";
                return (
                  <div
                    key={share.id}
                    className="flex items-center gap-3 rounded-lg px-3 py-2"
                    style={{ background: "#252525" }}
                  >
                    {/* Avatar */}
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#ff9a76] to-[#b57edc]">
                      <span style={{ fontSize: 10, fontWeight: 600, color: "#FFF" }}>{getInitials(name)}</span>
                    </div>
                    {/* Name */}
                    <span className="flex-1 truncate text-[12px] text-white/70">{name}</span>
                    {/* Permission selector */}
                    <select
                      value={share.permission}
                      onChange={(e) => handlePermissionChange(share.id, e.target.value)}
                      className="h-7 rounded bg-white/5 px-1.5 text-[10px] text-white/60 outline-none"
                      style={{ border: "1px solid #3A3A3A" }}
                    >
                      <option value="view">View</option>
                      <option value="edit">Edit</option>
                      <option value="admin">Admin</option>
                    </select>
                    {/* Remove button */}
                    <button
                      onClick={() => handleRemove(share.id)}
                      className="flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-white/5"
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M3 3L9 9M9 3L3 9" stroke="rgba(239,68,68,0.7)" strokeWidth="1.2" strokeLinecap="round" />
                      </svg>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
