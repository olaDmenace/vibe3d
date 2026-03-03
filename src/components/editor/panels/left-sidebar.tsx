"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useEditorStore } from "@/store/editor-store";
import { createClient } from "@/lib/supabase/client";

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface LeftSidebarProps {
  projectId?: string;
  projectName?: string;
}

/* ------------------------------------------------------------------ */
/*  Inline SVG Icons                                                   */
/* ------------------------------------------------------------------ */

function ArrowBackIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M10 12L6 8L10 4"
        stroke="white"
        strokeOpacity="0.4"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronIcon({ expanded, className }: { expanded: boolean; className?: string }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{
        transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
        transition: "transform 150ms ease",
      }}
    >
      <path
        d="M6 4L10 8L6 12"
        stroke="white"
        strokeOpacity="0.4"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M8 3V13M3 8H13"
        stroke="white"
        strokeOpacity="0.52"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SceneViewIcon() {
  return (
    <svg
      width="17"
      height="16"
      viewBox="0 0 17 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M8.5 2L14 5.5V10.5L8.5 14L3 10.5V5.5L8.5 2Z"
        stroke="white"
        strokeOpacity="0.6"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path
        d="M8.5 14V8.5M14 5.5L8.5 8.5M3 5.5L8.5 8.5"
        stroke="white"
        strokeOpacity="0.3"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MoreIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="8" cy="4" r="1" fill="white" fillOpacity="0.4" />
      <circle cx="8" cy="8" r="1" fill="white" fillOpacity="0.4" />
      <circle cx="8" cy="12" r="1" fill="white" fillOpacity="0.4" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle
        cx="7"
        cy="7"
        r="4.5"
        stroke="white"
        strokeOpacity="0.6"
        strokeWidth="1.2"
      />
      <path
        d="M10.5 10.5L13.5 13.5"
        stroke="white"
        strokeOpacity="0.6"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function TreeExpandIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      width="8"
      height="17"
      viewBox="0 0 8 17"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
        transition: "transform 150ms ease",
      }}
    >
      <path
        d="M2 4.5L6 8.5L2 12.5"
        stroke="white"
        strokeOpacity="0.2"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ProfileChevronIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M4 5.5L7 8.5L10 5.5"
        stroke="#C2C0B6"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/*  MeshPartsList — expandable mesh children in hierarchy               */
/* ------------------------------------------------------------------ */

function formatMeshName(name: string): string {
  return name
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function MeshPartsList({
  objectId: _objectId,
  meshNames,
  isObjectSelected,
}: {
  objectId: string;
  meshNames: string[];
  isObjectSelected: boolean;
}) {
  const highlightedMeshName = useEditorStore((s) => s.highlightedMeshName);
  const [hoveredPart, setHoveredPart] = useState<string | null>(null);

  if (!isObjectSelected) return null;

  return (
    <div className="flex flex-col">
      {meshNames.map((name) => {
        const isHighlighted = highlightedMeshName === name;
        const isHovered = hoveredPart === name;

        return (
          <button
            key={name}
            className="flex w-full items-center transition-colors"
            style={{
              height: 26,
              paddingLeft: 38,
              background: isHighlighted
                ? "rgba(245, 158, 11, 0.10)"
                : isHovered
                  ? "rgba(255, 255, 255, 0.04)"
                  : "transparent",
              borderLeft: isHighlighted
                ? "2px solid rgba(245, 158, 11, 0.4)"
                : "2px solid transparent",
            }}
            onClick={() => {
              useEditorStore.setState({
                highlightedMeshName: isHighlighted ? null : name,
              });
            }}
            onMouseEnter={() => {
              setHoveredPart(name);
              useEditorStore.setState({ highlightedMeshName: name });
            }}
            onMouseLeave={() => {
              setHoveredPart(null);
              if (!isHighlighted) {
                useEditorStore.setState({ highlightedMeshName: null });
              }
            }}
          >
            <span
              className="truncate text-left"
              style={{
                fontSize: 10,
                color: isHighlighted
                  ? "rgba(245, 158, 11, 0.9)"
                  : "rgba(255, 255, 255, 0.45)",
                fontFamily: "'Aeonik Pro', sans-serif",
              }}
            >
              {formatMeshName(name)}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function LeftSidebar({ projectId, projectName }: LeftSidebarProps) {
  const objects = useEditorStore((s) => s.scene.objects);
  const selectedObjectId = useEditorStore((s) => s.selectedObjectId);
  const dispatch = useEditorStore((s) => s.dispatch);

  const [scenesExpanded, setScenesExpanded] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedObjects, setExpandedObjects] = useState<Set<string>>(new Set());
  const [userName, setUserName] = useState("User");
  const [userPlan, setUserPlan] = useState("Free plan");
  const [userAvatarUrl, setUserAvatarUrl] = useState<string | null>(null);

  // Load user info from Supabase
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }: { data: { user: { id?: string; user_metadata?: Record<string, string>; email?: string } | null } }) => {
      if (user) {
        setUserName(
          user.user_metadata?.display_name ||
            user.email?.split("@")[0] ||
            "User"
        );
        // Load avatar + plan from profile
        if (user.id) {
          supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .single()
            .then(({ data }: { data: Record<string, unknown> | null }) => {
              if (data?.avatar_url) setUserAvatarUrl(data.avatar_url as string);
              const plan = data?.plan as string | undefined;
              const labels: Record<string, string> = { free: "Free", standard: "Standard", pro: "Pro", mega: "Mega" };
              setUserPlan((labels[plan ?? "free"] ?? "Free") + " plan");
            });
        }
      }
    });
  }, []);

  // Derive flat list of scene objects, filtered by search
  const objectList = useMemo(() => {
    const all = Object.values(objects);
    if (!searchQuery.trim()) return all;
    const q = searchQuery.toLowerCase();
    return all.filter((obj) => obj.name.toLowerCase().includes(q));
  }, [objects, searchQuery]);

  const toggleObjectExpanded = (id: string) => {
    setExpandedObjects((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectObject = (id: string) => {
    dispatch({ type: "SELECT_OBJECT", id });
  };

  return (
    <div
      className="fixed left-4 top-4 bottom-4 z-50 flex flex-col overflow-hidden"
      style={{
        width: 230,
        background: "#1F1F18",
        border: "1px solid rgba(222, 220, 209, 0.15)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderRadius: 20,
        fontFamily: "'Aeonik Pro', sans-serif",
      }}
    >
      {/* ========== HEADER ========== */}
      <div className="flex shrink-0 items-center" style={{ height: 40 }}>
        {/* Back button */}
        <Link
          href="/dashboard"
          className="flex shrink-0 items-center justify-center transition-opacity hover:opacity-70"
          style={{ width: 40, height: 40 }}
          aria-label="Back to dashboard"
        >
          <ArrowBackIcon />
        </Link>

        {/* Project title */}
        <span
          className="truncate"
          style={{
            fontSize: 11,
            color: "rgba(255, 255, 255, 0.92)",
            lineHeight: "40px",
            fontFamily: "'Aeonik Pro', sans-serif",
          }}
        >
          {projectName || "Untitled"}
        </span>
      </div>

      {/* ========== DIVIDER ========== */}
      <div className="shrink-0" style={{ height: 1, background: "rgba(255, 255, 255, 0.05)" }} />

      {/* ========== SCENES SECTION ========== */}
      <div className="shrink-0" style={{ height: 49 }}>
        <div
          className="flex items-center"
          style={{ paddingTop: 17, paddingLeft: 12, paddingRight: 12 }}
        >
          {/* Scenes label + chevron */}
          <button
            className="flex items-center gap-1 transition-opacity hover:opacity-80"
            onClick={() => setScenesExpanded(!scenesExpanded)}
          >
            <ChevronIcon expanded={scenesExpanded} />
            <span
              style={{
                fontSize: 11,
                color: "rgba(255, 255, 255, 0.92)",
                fontFamily: "'Aeonik Pro', sans-serif",
              }}
            >
              Scenes
            </span>
          </button>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Add scene button */}
          <button
            className="flex items-center justify-center transition-opacity hover:opacity-80"
            style={{
              width: 16,
              height: 16,
              border: "1px solid rgba(255, 255, 255, 0.52)",
              borderRadius: 3,
              opacity: 0.6,
            }}
            aria-label="Add new scene"
          >
            <PlusIcon />
          </button>
        </div>
      </div>

      {/* ========== SCENE LIST ========== */}
      {scenesExpanded && (
        <div className="shrink-0 overflow-y-auto" style={{ height: 44 }}>
          {/* Currently only one scene — "Scene 1" */}
          <div
            className="flex items-center transition-colors hover:bg-white/5"
            style={{
              height: 32,
              paddingLeft: 8,
              paddingRight: 8,
              background: "rgba(255, 255, 255, 0.04)",
              borderRadius: 6,
              margin: "0 6px",
            }}
          >
            <div className="shrink-0" style={{ width: 17 }}>
              <SceneViewIcon />
            </div>
            <span
              className="ml-2 flex-1 truncate"
              style={{
                fontSize: 11,
                color: "rgba(255, 255, 255, 0.7)",
                fontFamily: "'Aeonik Pro', sans-serif",
              }}
            >
              Scene 1
            </span>
            <button
              className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100 hover:opacity-80"
              aria-label="Scene options"
            >
              <MoreIcon />
            </button>
          </div>
        </div>
      )}

      {/* ========== DIVIDER ========== */}
      <div className="shrink-0" style={{ height: 1, background: "rgba(255, 255, 255, 0.05)" }} />

      {/* ========== SEARCH INPUT ========== */}
      <div className="shrink-0" style={{ padding: "12px 12px 0 12px" }}>
        <div
          className="relative flex items-center"
          style={{
            background: "rgba(255, 255, 255, 0.05)",
            borderRadius: 8,
            height: 32,
          }}
        >
          <div
            className="pointer-events-none absolute flex items-center justify-center"
            style={{ left: 10, width: 16, height: 16 }}
          >
            <SearchIcon />
          </div>
          <input
            type="text"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-full w-full bg-transparent outline-none placeholder:text-white/[0.52]"
            style={{
              paddingLeft: 32,
              paddingRight: 10,
              fontSize: 11,
              color: "rgba(255, 255, 255, 0.92)",
              fontFamily: "'Aeonik Pro', sans-serif",
            }}
          />
        </div>
      </div>

      {/* ========== OBJECT HIERARCHY TREE ========== */}
      <div className="mt-3 flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
        {objectList.length === 0 && (
          <div
            className="flex items-center justify-center"
            style={{
              height: 64,
              fontSize: 11,
              color: "rgba(255, 255, 255, 0.3)",
              fontFamily: "'Spline Sans', 'Aeonik Pro', sans-serif",
            }}
          >
            {searchQuery ? "No results" : "No objects in scene"}
          </div>
        )}

        {objectList.map((obj) => {
          const isSelected = obj.id === selectedObjectId;
          const isExpanded = expandedObjects.has(obj.id);
          const meshNames = (obj.metadata?.meshNames as string[]) ?? [];
          const hasMeshParts = meshNames.length >= 2;

          return (
            <div key={obj.id}>
              {/* Object row */}
              <button
                className="flex w-full items-center transition-colors"
                style={{
                  height: 32,
                  background: isSelected
                    ? "rgba(255, 255, 255, 0.08)"
                    : "transparent",
                  borderLeft: isSelected
                    ? "2px solid rgba(255, 255, 255, 0.3)"
                    : "2px solid transparent",
                }}
                onClick={() => handleSelectObject(obj.id)}
                onDoubleClick={() => { if (hasMeshParts) toggleObjectExpanded(obj.id); }}
              >
                {/* Expand icon */}
                <div
                  className="flex shrink-0 items-center justify-center"
                  style={{ width: 24, paddingLeft: 6 }}
                  onClick={(e) => {
                    if (hasMeshParts) {
                      e.stopPropagation();
                      toggleObjectExpanded(obj.id);
                    }
                  }}
                >
                  <TreeExpandIcon expanded={isExpanded && hasMeshParts} />
                </div>

                {/* Object name */}
                <span
                  className="flex-1 truncate text-left"
                  style={{
                    fontSize: 11,
                    color: isSelected ? "#E5E5E7" : "rgba(229, 229, 231, 0.7)",
                    fontFamily: "'Aeonik Pro', sans-serif",
                    paddingLeft: 2.5,
                  }}
                >
                  {obj.name}
                </span>

                {/* Part count badge for models with mesh parts */}
                {hasMeshParts && (
                  <span
                    className="mr-1 shrink-0"
                    style={{
                      fontSize: 9,
                      color: "rgba(255, 255, 255, 0.3)",
                      fontFamily: "'Spline Sans', sans-serif",
                    }}
                  >
                    {meshNames.length}p
                  </span>
                )}

                {/* Visibility indicator for hidden objects */}
                {!obj.visible && (
                  <span
                    className="mr-2 shrink-0"
                    style={{
                      fontSize: 9,
                      color: "rgba(255, 255, 255, 0.25)",
                      fontFamily: "'Spline Sans', sans-serif",
                    }}
                  >
                    hidden
                  </span>
                )}
              </button>

              {/* Expanded mesh part children */}
              {isExpanded && hasMeshParts && (
                <MeshPartsList
                  objectId={obj.id}
                  meshNames={meshNames}
                  isObjectSelected={isSelected}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* ========== BOTTOM SECTION ========== */}
      <div
        className="shrink-0"
        style={{
          height: 65,
          borderTop: "1px solid rgba(222, 220, 209, 0.15)",
        }}
      >
        <div className="flex items-center" style={{ height: 65, paddingLeft: 16, paddingRight: 12 }}>
          {/* User avatar */}
          <div
            className="relative shrink-0"
            style={{ width: 38, height: 38 }}
          >
            {/* Outer border circle */}
            <div
              className="absolute inset-0 rounded-full"
              style={{
                border: "1px solid rgba(222, 220, 209, 0.2)",
              }}
            />
            {/* Inner circle — avatar image or initials */}
            <div
              className="absolute overflow-hidden rounded-full"
              style={{
                width: 31,
                height: 31,
                top: 3.5,
                left: 3.5,
              }}
            >
              {userAvatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={userAvatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div
                  className="flex h-full w-full items-center justify-center"
                  style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6, #a78bfa)" }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: "white",
                      fontFamily: "'Aeonik Pro', sans-serif",
                    }}
                  >
                    {(() => {
                      const parts = userName.trim().split(/\s+/).filter(Boolean);
                      if (parts.length === 0) return "?";
                      if (parts.length === 1) return parts[0][0].toUpperCase();
                      return (parts[0][0] + parts[1][0]).toUpperCase();
                    })()}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Name + plan */}
          <div className="ml-3 flex min-w-0 flex-1 flex-col">
            <span
              className="truncate"
              style={{
                fontSize: 14,
                color: "#C2C0B6",
                fontFamily: "'Aeonik Pro', sans-serif",
                lineHeight: "18px",
              }}
            >
              {userName}
            </span>
            <span
              className="truncate"
              style={{
                fontSize: 12,
                color: "#9C9A92",
                fontFamily: "'Aeonik Pro', sans-serif",
                lineHeight: "16px",
              }}
            >
              {userPlan}
            </span>
          </div>

          {/* Expand chevron */}
          <button
            className="flex shrink-0 items-center justify-center transition-opacity hover:opacity-70"
            style={{ width: 14, height: 14 }}
            aria-label="Account menu"
          >
            <ProfileChevronIcon />
          </button>
        </div>
      </div>
    </div>
  );
}
