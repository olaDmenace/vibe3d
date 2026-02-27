"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";
import { Search, ChevronDown, ChevronRight, Trash2, Settings, Plus, LogOut } from "lucide-react";
import { SettingsModal } from "@/components/settings/settings-modal";
import type { Tables } from "@/types/database";

type Project = Tables<"projects">;
type ViewMode = "grid" | "list";

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

const SUGGESTIONS = [
  "Create a futuristic sport car",
  "Create a modern building",
  "Create a 3D chess Piece",
];

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [userPlan, setUserPlan] = useState("Free");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [profileOpen, setProfileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const supabase = createClient();

  // Redirect to onboarding if not completed & load user info
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && !user.user_metadata?.onboarding_completed) {
        router.replace("/onboarding");
        return;
      }
      if (user) {
        setUserName(user.user_metadata?.display_name || user.email?.split("@")[0] || "User");
        setUserEmail(user.email || "");
        // Load avatar + plan from profile
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();
        if (profile?.avatar_url) setAvatarUrl(profile.avatar_url);
        const profilePlan = (profile as Record<string, unknown> | null)?.plan as string | undefined;
        if (profilePlan) {
          const labels: Record<string, string> = { free: "Free", standard: "Standard", pro: "Pro", mega: "Mega" };
          setUserPlan(labels[profilePlan] ?? "Free");
        }
      }
      loadProjects();
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close profile dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    if (profileOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [profileOpen]);

  async function loadProjects() {
    setLoading(true);
    const res = await fetch("/api/projects");
    if (res.ok) {
      const data = await res.json();
      setProjects(data);
    }
    setLoading(false);
  }

  async function createProject(initialPrompt?: string) {
    setCreating(true);
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: initialPrompt || "Untitled Project" }),
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

  function handlePromptSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim() || creating) return;
    createProject(prompt.trim());
  }

  const filteredProjects = searchQuery
    ? projects.filter((p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : projects;

  function formatTimeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Edited just now";
    if (mins < 60) return `Edited ${mins} minute${mins !== 1 ? "s" : ""} ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `Edited ${hours} hour${hours !== 1 ? "s" : ""} ago`;
    const days = Math.floor(hours / 24);
    return `Edited ${days} day${days !== 1 ? "s" : ""} ago`;
  }

  return (
    <div
      className="min-h-screen bg-[#262624]"
      style={{ fontFamily: "'Aeonik Pro', sans-serif" }}
    >
      {/* ============ Top-left logo bar (with view toggle inside) ============ */}
      <div className="fixed left-4 top-[19px] z-10 flex h-[62px] w-[230px] items-center justify-between rounded-[20px] border border-[rgba(222,220,209,0.15)] bg-[#1F1F18] backdrop-blur-[16px]">
        {/* Logo */}
        <Image
          src="/assets/icons/logo-gem.svg"
          alt="Vibe3D"
          width={30}
          height={31}
          className="ml-[14px] drop-shadow-[0_0_8px_rgba(255,200,180,0.3)]"
        />

        {/* View toggle pill */}
        <div
          className="mr-[14px] flex items-center"
          style={{
            width: 83,
            height: 33.52,
            background: "rgba(0, 0, 0, 0.2)",
            borderRadius: 15.96,
            padding: "3.99px 6.38px",
            gap: 3,
          }}
        >
          {/* List view button — active gets wider pill (39.11), inactive stays compact (25.54) */}
          <button
            onClick={() => setViewMode("list")}
            className="flex items-center justify-center transition-all duration-200"
            style={{
              width: viewMode === "list" ? 39.11 : 25.54,
              height: 25.54,
              borderRadius: viewMode === "list" ? 15.16 : 6.38,
              background: viewMode === "list" ? "rgba(255, 255, 255, 0.08)" : "transparent",
              boxShadow: viewMode === "list"
                ? "0px 1.04px 4.15px rgba(0,0,0,0.1), inset 0px 0.52px 0px rgba(255,255,255,0.1)"
                : "none",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 4H13" stroke={viewMode === "list" ? "#FFFFFF" : "rgba(255,255,255,0.35)"} strokeWidth="1.5" strokeLinecap="round" />
              <path d="M3 8H13" stroke={viewMode === "list" ? "#FFFFFF" : "rgba(255,255,255,0.35)"} strokeWidth="1.5" strokeLinecap="round" />
              <path d="M3 12H13" stroke={viewMode === "list" ? "#FFFFFF" : "rgba(255,255,255,0.35)"} strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
          {/* Grid view button — active gets wider pill (39.11), inactive stays compact (25.54) */}
          <button
            onClick={() => setViewMode("grid")}
            className="flex items-center justify-center transition-all duration-200"
            style={{
              width: viewMode === "grid" ? 39.11 : 25.54,
              height: 25.54,
              borderRadius: viewMode === "grid" ? 15.16 : 6.38,
              background: viewMode === "grid" ? "rgba(255, 255, 255, 0.08)" : "transparent",
              boxShadow: viewMode === "grid"
                ? "0px 1.04px 4.15px rgba(0,0,0,0.1), inset 0px 0.52px 0px rgba(255,255,255,0.1)"
                : "none",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="2" y="2" width="5" height="5" rx="1" stroke={viewMode === "grid" ? "#FFFFFF" : "rgba(255,255,255,0.35)"} strokeWidth="1.3" />
              <rect x="9" y="2" width="5" height="5" rx="1" stroke={viewMode === "grid" ? "#FFFFFF" : "rgba(255,255,255,0.35)"} strokeWidth="1.3" />
              <rect x="2" y="9" width="5" height="5" rx="1" stroke={viewMode === "grid" ? "#FFFFFF" : "rgba(255,255,255,0.35)"} strokeWidth="1.3" />
              <rect x="9" y="9" width="5" height="5" rx="1" stroke={viewMode === "grid" ? "#FFFFFF" : "rgba(255,255,255,0.35)"} strokeWidth="1.3" />
            </svg>
          </button>
        </div>
      </div>

      {/* ============ Top-right profile bar + dropdown ============ */}
      <div ref={profileRef} className="fixed right-4 top-[19px] z-20">
        {/* Profile trigger button */}
        <button
          onClick={() => setProfileOpen((prev) => !prev)}
          className="relative overflow-hidden transition-colors hover:brightness-110"
          style={{
            width: 230,
            height: 62,
            background: "#1F1F18",
            border: "1px solid rgba(222, 220, 209, 0.15)",
            backdropFilter: "blur(16px)",
            borderRadius: 20,
          }}
        >
          {/* Gradient glow — SVG with filter effects */}
          <Image
            src="/assets/icons/profile-gradient-glow.svg"
            alt=""
            width={230}
            height={62}
            className="pointer-events-none absolute inset-0"
            style={{ mixBlendMode: "plus-lighter" }}
          />
          {/* Avatar — Border circle */}
          <div
            className="absolute rounded-full"
            style={{
              width: 38,
              height: 38,
              left: 16,
              top: 13,
              border: "1px solid rgba(255, 255, 255, 0.1)",
            }}
          >
            {/* Inner circle — avatar image or initials */}
            <div
              className="absolute overflow-hidden rounded-full"
              style={{
                width: 31,
                height: 31,
                left: "calc(50% - 31px/2 + 0.5px)",
                top: "calc(50% - 31px/2 + 0.5px)",
              }}
            >
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#ff9a76] to-[#b57edc]">
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#FFFFFF", fontFamily: "'Aeonik Pro', sans-serif" }}>
                    {getInitials(userName)}
                  </span>
                </div>
              )}
            </div>
          </div>
          {/* Name */}
          <span
            className="absolute truncate text-left"
            style={{
              left: 66,
              right: 34,
              top: 14,
              fontFamily: "'Aeonik Pro', sans-serif",
              fontSize: 14,
              lineHeight: "20px",
              color: "#FFFFFF",
            }}
          >
            {userName}
          </span>
          {/* Plan */}
          <span
            className="absolute text-left"
            style={{
              left: 66,
              right: 34,
              top: 34,
              fontFamily: "'Aeonik Pro', sans-serif",
              fontSize: 12,
              lineHeight: "16px",
              color: "#FFFFFF",
            }}
          >
            {userPlan} plan
          </span>
          {/* Chevron — down arrow matching Figma vector */}
          <svg
            width="14"
            height="14"
            viewBox="0 0 16 16"
            fill="none"
            className={`absolute transition-transform duration-200 ${profileOpen ? "rotate-180" : ""}`}
            style={{ left: 197, top: "calc(50% - 7px)" }}
          >
            <path d="M4.5 6L8 10L11.5 6" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {/* Profile dropdown menu */}
        {profileOpen && (
          <div className="absolute right-0 top-[72px] w-[230px] overflow-hidden rounded-[20px] border border-[rgba(222,220,209,0.15)] bg-[#1F1F18]">
            {/* Settings button */}
            <div className="p-[13px] pb-0">
              <button
                onClick={() => {
                  setSettingsOpen(true);
                  setProfileOpen(false);
                }}
                className="flex w-full items-center justify-center gap-2 rounded-[14px] bg-[rgba(255,255,255,0.08)] px-4 py-[8px] shadow-[0px_2px_8px_rgba(0,0,0,0.1),inset_0px_1px_0px_rgba(255,255,255,0.1)] transition-colors hover:bg-[rgba(255,255,255,0.12)]"
              >
                <Settings size={16} className="text-[rgba(255,255,255,0.7)]" />
                <span className="text-[11px] leading-[12.65px] text-[rgba(255,255,255,0.7)]">Settings</span>
              </button>
            </div>

            {/* Email + workspace section */}
            <div className="px-[7px] pt-[12px]">
              <p className="px-[8px] pb-[8px] text-[11px] leading-[12.65px] text-[rgba(255,255,255,0.52)]">
                {userEmail}
              </p>
              {/* Workspace row */}
              <button className="flex w-full items-center gap-3 rounded-[8px] px-[7px] py-[8px] transition-colors hover:bg-[rgba(255,255,255,0.05)]">
                <div className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-[#121316]">
                  <div className="h-[24px] w-[24px] rounded-full bg-gradient-to-br from-[#ff9a76] to-[#b57edc]" />
                </div>
                <span className="flex-1 text-left text-[12px] leading-[16px] text-[rgba(255,255,255,0.7)]">
                  {userName}&apos;s Workspace
                </span>
                {/* Checkmark */}
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0 text-[rgba(255,255,255,0.7)]">
                  <path d="M3.5 8.5L6.5 11.5L12.5 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>

            {/* Create workspace */}
            <div className="px-[7px]">
              <button className="flex w-full items-center gap-2 rounded-[8px] px-[7px] py-[8px] transition-colors hover:bg-[rgba(255,255,255,0.05)]">
                <div className="flex h-[24px] w-[24px] items-center justify-center">
                  <Plus size={16} className="text-[rgba(255,255,255,0.7)]" />
                </div>
                <span className="text-[12px] leading-[16px] text-[rgba(255,255,255,0.7)]">Create Workspace</span>
              </button>
            </div>

            {/* Separator */}
            <div className="mx-[7px] my-[4px] h-px bg-[rgba(255,255,255,0.05)]" />

            {/* Theme */}
            <div className="px-[7px]">
              <button className="flex w-full items-center gap-[10px] rounded-[8px] px-[10px] py-[8px] transition-colors hover:bg-[rgba(255,255,255,0.05)]">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="3" stroke="rgba(255,255,255,0.7)" strokeWidth="1.3" />
                  <path d="M8 2V3M8 13V14M2 8H3M13 8H14M3.76 3.76L4.47 4.47M11.53 11.53L12.24 12.24M12.24 3.76L11.53 4.47M4.47 11.53L3.76 12.24" stroke="rgba(255,255,255,0.7)" strokeWidth="1.3" strokeLinecap="round" />
                </svg>
                <span className="flex-1 text-left text-[11px] leading-[12.65px] text-[rgba(255,255,255,0.7)]">Theme</span>
                <ChevronRight size={16} className="text-[rgba(255,255,255,0.4)]" />
              </button>
            </div>

            {/* Separator */}
            <div className="mx-[7px] my-[4px] h-px bg-[rgba(255,255,255,0.05)]" />

            {/* Logout */}
            <div className="px-[7px] pb-[7px]">
              <button
                onClick={signOut}
                className="flex w-full items-center gap-[10px] rounded-[8px] px-[10px] py-[8px] transition-colors hover:bg-[rgba(255,255,255,0.05)]"
              >
                <LogOut size={16} className="text-[rgba(255,255,255,0.7)]" />
                <span className="text-[11px] leading-[12.65px] text-[rgba(255,255,255,0.7)]">Logout</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ============ Main content ============ */}
      <div className="mx-auto flex max-w-[1084px] flex-col items-center gap-[58px] px-8 pt-[140px] pb-16">
        {/* Hero section */}
        <div className="flex w-full max-w-[626px] flex-col items-center gap-[37px]">
          {/* Title — gem icon + heading */}
          <div className="flex w-[508px] items-center gap-1">
            <Image
              src="/assets/icons/logo-gem.svg"
              alt=""
              width={40}
              height={41}
              className="shrink-0 drop-shadow-[0_0_12px_rgba(255,200,180,0.3)]"
            />
            <h1
              className="text-[37.5px] leading-[59px] text-[#C2C0B6]"
              style={{ fontFamily: "'PP Mondwest', Georgia, serif" }}
            >
              What would you like to create?
            </h1>
          </div>

          {/* AI prompt input box */}
          <form
            onSubmit={handlePromptSubmit}
            className="relative w-[626px] overflow-hidden rounded-[20px] bg-[#30302E] shadow-[0px_4px_20px_rgba(0,0,0,0.035),0px_0px_0px_0.5px_rgba(222,220,209,0.15)]"
            style={{ height: 145 }}
          >
            {/* Gradient glow — inlined SVG from Figma export (inline SVG needed
                 so mix-blend-mode composites against the form bg, not a
                 transparent wrapper) */}
            <svg
              className="pointer-events-none absolute"
              style={{ left: 30, top: 27 }}
              width="597"
              height="118"
              viewBox="0 0 597 118"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <g filter="url(#dash_glow_noise)">
                <g filter="url(#dash_glow_blue)" style={{ mixBlendMode: "plus-lighter" }}>
                  <path d="M617.13 74.3646L611.763 109.251V156.788L530.49 220.043L367.176 214.676L42.6301 220.043L395.63 105.63L533.13 93.6302L563.63 42.6302L617.13 74.3646Z" fill="#507AEF"/>
                </g>
                <g filter="url(#dash_glow_orange)" style={{ mixBlendMode: "plus-lighter" }}>
                  <path d="M555.459 100.154L549.044 131.107V173.285L451.902 229.408L256.701 224.646L208.13 168.863L267.24 109.678H379.962L473.896 90.6302L555.459 100.154Z" fill="#FF774F"/>
                </g>
              </g>
              <defs>
                <filter id="dash_glow_noise" x="42.6301" y="42.6302" width="574.5" height="186.778" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                  <feFlood floodOpacity="0" result="BackgroundImageFix"/>
                  <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
                  <feTurbulence type="fractalNoise" baseFrequency="2 2" stitchTiles="stitch" numOctaves={3} result="noise" seed="9516"/>
                  <feColorMatrix in="noise" type="luminanceToAlpha" result="alphaNoise"/>
                  <feComponentTransfer in="alphaNoise" result="coloredNoise1">
                    <feFuncA type="discrete" tableValues="1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0"/>
                  </feComponentTransfer>
                  <feComposite operator="in" in2="shape" in="coloredNoise1" result="noise1Clipped"/>
                  <feFlood floodColor="rgba(0, 0, 0, 0.25)" result="color1Flood"/>
                  <feComposite operator="in" in2="noise1Clipped" in="color1Flood" result="color1"/>
                  <feMerge result="effect1_noise">
                    <feMergeNode in="shape"/>
                    <feMergeNode in="color1"/>
                  </feMerge>
                </filter>
                <filter id="dash_glow_blue" x="0" y="0" width="659.76" height="262.674" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                  <feFlood floodOpacity="0" result="BackgroundImageFix"/>
                  <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
                  <feGaussianBlur stdDeviation="21.3151" result="effect1_foregroundBlur"/>
                </filter>
                <filter id="dash_glow_orange" x="165.5" y="48" width="432.589" height="224.039" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                  <feFlood floodOpacity="0" result="BackgroundImageFix"/>
                  <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
                  <feGaussianBlur stdDeviation="21.3151" result="effect1_foregroundBlur"/>
                </filter>
              </defs>
            </svg>

            {/* Inner textarea container — Figma: left:2, top:3, 622×108 */}
            <div
              className="absolute flex flex-col rounded-[18px] bg-[#3E3E3E]"
              style={{
                left: 2,
                top: 2,
                width: 622,
                height: 108,
                boxShadow: "0px 20.62px 16.5px rgba(26, 0, 108, 0.042), 0px 2.55px 2.04px rgba(26, 0, 108, 0.02)",
              }}
            >
              {/* Textarea */}
              <div className="relative flex-1 px-4 pt-3">
                {/* Blue cursor indicator bar — shown when empty */}
                {prompt.length === 0 && (
                  <div
                    className="absolute"
                    style={{
                      left: 16,
                      top: 14,
                      width: 0.92,
                      height: 13.85,
                      background: "#39A6FF",
                      borderRadius: 1,
                    }}
                  />
                )}
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe what you want to create in 3D..."
                  className="h-full w-full resize-none bg-transparent text-[11px] leading-[16px] tracking-[0.3px] text-white/90 placeholder:text-white/40 outline-none"
                  style={{
                    fontFamily: "'Spline Sans', sans-serif",
                    paddingLeft: prompt.length === 0 ? 6 : 0,
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handlePromptSubmit(e);
                    }
                  }}
                />
              </div>
              {/* Bottom row: attach left, audio right */}
              <div className="flex items-center justify-between px-3 pb-3">
                <button type="button" className="flex h-[31px] w-[31px] items-center justify-center rounded-[5.4px] transition-opacity hover:opacity-80">
                  <Image src="/assets/icons/dashboard-attach.svg" alt="Attach" width={20} height={20} style={{ opacity: 0.7 }} />
                </button>
                <button
                  type="submit"
                  disabled={!prompt.trim() || creating}
                  className="flex h-[32px] w-[32px] items-center justify-center rounded-[8px] transition-opacity disabled:opacity-30"
                >
                  <Image src="/assets/icons/dashboard-audio.svg" alt="Voice" width={20} height={20} style={{ opacity: 0.7 }} />
                </button>
              </div>
            </div>

            {/* Model selector row — Figma: left:13.04, top:113.52 */}
            <div
              className="absolute flex items-center gap-1.5"
              style={{ left: 13.04, top: 113.52, height: 24 }}
            >
              <Image src="/assets/icons/dashboard-sparkle.svg" alt="" width={17} height={17} style={{ opacity: 0.5 }} />
              <span
                className="text-[11px] tracking-[0.3px] text-[rgba(255,255,255,0.95)]"
                style={{ fontFamily: "'Spline Sans', sans-serif" }}
              >
                NanoBanana
              </span>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ opacity: 0.7 }}>
                <path d="M5 6.5L8 9.5L11 6.5" stroke="rgba(255,255,255,0.95)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </form>

          {/* Suggestion chips */}
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => {
                  setPrompt(s);
                }}
                className="flex items-center gap-1.5 rounded-[6.5px] border-[0.81px] border-[rgba(222,220,209,0.15)] bg-[#262624] px-2.5 py-1 transition-colors hover:border-[rgba(222,220,209,0.3)] hover:bg-[#30302e]"
              >
                <Image src="/assets/icons/dashboard-stars.svg" alt="" width={16} height={16} className="shrink-0" />
                <span className="text-[11.4px] leading-[16px] text-[#C2C0B6]">{s}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ============ Projects section ============ */}
        <div className="flex w-full flex-col gap-[18px]">
          {/* Search + filters row */}
          <div className="flex items-center justify-between">
            <div className="relative flex h-8 w-[502px] items-center rounded-lg bg-[rgba(255,255,255,0.05)]">
              <Search size={16} className="ml-3 opacity-60 text-white" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search"
                className="h-full flex-1 bg-transparent px-2 text-[11px] text-white placeholder:text-[rgba(255,255,255,0.52)] outline-none"
                style={{ fontFamily: "'Aeonik Pro', sans-serif" }}
              />
            </div>
            <div className="flex items-center gap-2.5">
              <button className="flex h-6 items-center rounded-[6.5px] border border-[rgba(222,220,209,0.15)] bg-[#262624] px-3 text-[10.8px] tracking-[0.055px] text-white">
                Recently viewed
              </button>
              <div className="flex h-6 items-center gap-1 rounded-[5px] bg-[rgba(255,255,255,0.05)] px-2">
                <span className="text-[10.8px] tracking-[0.055px] text-white">Last viewed</span>
                <ChevronDown size={12} className="text-[rgba(255,255,255,0.5)]" />
              </div>
            </div>
          </div>

          {/* Project cards — grid or list view */}
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-[rgba(222,220,209,0.3)] border-t-[#faf9f5]" />
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 rounded-[13px] border border-dashed border-[#444] py-24">
              <Image src="/assets/icons/dashboard-3d-view.svg" alt="" width={48} height={48} className="opacity-30" />
              <p className="text-sm text-[rgba(255,255,255,0.5)]">
                {searchQuery ? "No matching projects" : "No projects yet"}
              </p>
              {!searchQuery && (
                <p className="text-xs text-[rgba(255,255,255,0.3)]">
                  Use the prompt above to create your first 3D model
                </p>
              )}
            </div>
          ) : viewMode === "grid" ? (
            /* Grid view — 3 columns, 16px gap */
            <div className="grid grid-cols-3 gap-4">
              {filteredProjects.map((project) => (
                <div
                  key={project.id}
                  onClick={() => router.push(`/editor/${project.id}`)}
                  className="group cursor-pointer overflow-hidden rounded-[13px] border border-[#444444] transition-colors hover:border-[#555]"
                >
                  {/* Thumbnail */}
                  <div className="relative bg-[#1E1E1E]" style={{ height: "calc(257.11px - 59px)" }}>
                    {project.thumbnail_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={project.thumbnail_url}
                        alt={project.name}
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                    {/* Delete button — appears on hover */}
                    <button
                      onClick={(e) => deleteProject(project.id, e)}
                      className="absolute right-4 top-4 flex h-6 w-6 items-center justify-center rounded-[5px] border border-[#444] bg-[#2C2C2C] text-[rgba(255,255,255,0.5)] opacity-0 transition-all hover:text-red-400 group-hover:opacity-100"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  {/* Footer — 59px tall */}
                  <div className="flex h-[59px] items-center gap-3 border-t border-[#444444] bg-[#2C2C2C] px-[17px]">
                    <Image
                      src="/assets/icons/dashboard-3d-view.svg"
                      alt=""
                      width={17}
                      height={17}
                      className="shrink-0 opacity-70"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[10.8px] tracking-[0.055px] text-[#FFFFFF]">
                        {project.name}
                      </p>
                      <p className="text-[10.8px] tracking-[0.055px] text-[rgba(255,255,255,0.7)]">
                        {formatTimeAgo(project.updated_at!)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* List view */
            <div className="flex flex-col gap-2">
              {filteredProjects.map((project) => (
                <div
                  key={project.id}
                  onClick={() => router.push(`/editor/${project.id}`)}
                  className="group flex h-[60px] cursor-pointer items-center gap-4 rounded-[13px] border border-[#444444] bg-[#2C2C2C] px-4 transition-colors hover:border-[#555]"
                >
                  {/* Thumbnail */}
                  <div className="h-[42px] w-[64px] shrink-0 overflow-hidden rounded-[6px] bg-[#1E1E1E]">
                    {project.thumbnail_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={project.thumbnail_url}
                        alt={project.name}
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                  </div>
                  {/* Icon */}
                  <Image
                    src="/assets/icons/dashboard-3d-view.svg"
                    alt=""
                    width={17}
                    height={17}
                    className="shrink-0 opacity-70"
                  />
                  {/* Name */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[10.8px] tracking-[0.055px] text-[#FFFFFF]">
                      {project.name}
                    </p>
                  </div>
                  {/* Time */}
                  <p className="shrink-0 text-[10.8px] tracking-[0.055px] text-[rgba(255,255,255,0.7)]">
                    {formatTimeAgo(project.updated_at!)}
                  </p>
                  {/* Delete button — appears on hover */}
                  <button
                    onClick={(e) => deleteProject(project.id, e)}
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[5px] border border-[#444] bg-[#2C2C2C] text-[rgba(255,255,255,0.5)] opacity-0 transition-all hover:text-red-400 group-hover:opacity-100"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ============ Settings Modal ============ */}
      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        userName={userName}
        userEmail={userEmail}
        avatarUrl={avatarUrl}
        onNameChange={(newName) => setUserName(newName)}
        onAvatarChange={(newUrl) => setAvatarUrl(newUrl)}
        onAccountDeleted={() => router.replace("/sign-in")}
      />
    </div>
  );
}
