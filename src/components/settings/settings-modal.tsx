"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { PLAN_CONFIGS, type PlanTier } from "@/lib/ai/types";
import { useTheme } from "@/components/theme-provider";
import { usePushNotifications } from "@/hooks/use-push-notifications";

const PLAN_CONFIGS_LOCAL = PLAN_CONFIGS;

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface UserPreferences {
  theme: "dark" | "light" | "auto";
  language: string;
  push_notifications: boolean;
  email_updates: boolean;
}

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  userName: string;
  userEmail: string;
  avatarUrl?: string | null;
  /** Called after display_name is successfully changed so parent can update. */
  onNameChange?: (newName: string) => void;
  /** Called after avatar is uploaded so parent can update. */
  onAvatarChange?: (newUrl: string) => void;
  /** Called after account is deleted so parent can redirect. */
  onAccountDeleted?: () => void;
}

/** Extract up to 2 initials from a display name. */
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

type SettingsTab =
  | "account"
  | "preferences"
  | "billing"
  | "danger-zone";
type ThemeOption = "dark" | "light" | "auto";

const TABS: { id: SettingsTab; label: string }[] = [
  { id: "account", label: "Account" },
  { id: "preferences", label: "Preferences" },
  { id: "billing", label: "Billing" },
  { id: "danger-zone", label: "Danger Zone" },
];

/** Ideal modal height per tab (capped by maxHeight: 90vh). Omit for auto. */
const TAB_HEIGHTS: Partial<Record<SettingsTab, number>> = {
  account: 280,
  preferences: 675,
};

/* ------------------------------------------------------------------ */
/*  Inline SVG Icons                                                   */
/* ------------------------------------------------------------------ */

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path
        d="M3 3L11 11M11 3L3 11"
        stroke="rgba(255,255,255,0.5)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        d="M4.5 6L8 9.5L11.5 6"
        stroke="#A3A3A3"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** White circle with black checkmark — used in billing features list. */
function CircleCheckIcon() {
  return (
    <div
      className="flex shrink-0 items-center justify-center"
      style={{
        width: 16,
        height: 16,
        background: "#FFFFFF",
        borderRadius: 8,
      }}
    >
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
        <path
          d="M2 5.5L4 7.5L8 3"
          stroke="#000000"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

function SpinnerIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="animate-spin">
      <circle cx="7" cy="7" r="5.5" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" />
      <path
        d="M12.5 7A5.5 5.5 0 0 0 7 1.5"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Checkbox                                                           */
/* ------------------------------------------------------------------ */

function Checkbox({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="flex shrink-0 items-center justify-center"
      style={{
        width: 13,
        height: 13,
        borderRadius: 2.5,
        background: checked ? "#7CC4F8" : "#FFFFFF",
        border: checked ? "none" : "1px solid #767676",
      }}
    >
      {checked && (
        <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
          <path
            d="M1.5 4.5L3.5 6.5L7.5 2.5"
            stroke="#000"
            strokeWidth="1.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Status toast                                                       */
/* ------------------------------------------------------------------ */

function StatusToast({ message, type }: { message: string; type: "success" | "error" }) {
  return (
    <div
      className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-lg px-4 py-2"
      style={{
        background: type === "success" ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
        border: `1px solid ${type === "success" ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
        fontSize: 12,
        color: type === "success" ? "#10B981" : "#EF4444",
      }}
    >
      {message}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export function SettingsModal({
  open,
  onClose,
  userName,
  userEmail,
  avatarUrl,
  onNameChange,
  onAvatarChange,
  onAccountDeleted,
}: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>("account");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Account editing states
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(userName);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Theme from context (actually applies the theme)
  const { theme, setTheme: setGlobalTheme } = useTheme();

  // Push notifications
  const { supported: pushSupported, permission: pushPermission, requestPermission } = usePushNotifications();

  // Preferences state
  const [language, setLanguage] = useState("en");
  const [pushNotifications, setPushNotifications] = useState(true);
  const [emailUpdates, setEmailUpdates] = useState(false);
  const [prefsLoaded, setPrefsLoaded] = useState(false);

  // Billing state
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");
  const [currentPlan, setCurrentPlan] = useState<PlanTier>("free");
  const [generationsUsed, setGenerationsUsed] = useState(0);
  const [upgradingTier, setUpgradingTier] = useState<PlanTier | null>(null);

  // UI states
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Sync input states when props change (e.g. after name update in parent)
  useEffect(() => { setNameInput(userName); }, [userName]);

  // Load preferences from backend on open
  useEffect(() => {
    if (!open || prefsLoaded) return;
    fetch("/api/user")
      .then((r) => r.json())
      .then((data) => {
        if (data.preferences) {
          const p = data.preferences as UserPreferences;
          setGlobalTheme(p.theme ?? "dark");
          setLanguage(p.language ?? "en");
          setPushNotifications(p.push_notifications ?? true);
          setEmailUpdates(p.email_updates ?? false);
        }
        // Load billing info
        if (data.plan) setCurrentPlan(data.plan as PlanTier);
        if (typeof data.generations_used === "number") setGenerationsUsed(data.generations_used);
        setPrefsLoaded(true);
      })
      .catch(() => setPrefsLoaded(true));
  }, [open, prefsLoaded]);

  // Reset states when modal closes
  useEffect(() => {
    if (!open) {
      setEditingName(false);
      setDeleteConfirm(false);
      setToast(null);
    }
  }, [open]);

  const showToast = useCallback((message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // --- Handlers ---

  const handleSaveName = async () => {
    const trimmed = nameInput.trim();
    if (!trimmed || trimmed === userName) {
      setEditingName(false);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/user", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ display_name: trimmed }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      onNameChange?.(trimmed);
      setEditingName(false);
      showToast("Name updated", "success");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed to update name", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      showToast("Image must be under 2MB", "error");
      return;
    }

    setUploadingAvatar(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/avatar.${ext}`;

      // Upload to storage (upsert to replace existing)
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(path);

      // Append cache-buster so the browser loads the new image
      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      // Save URL to profile
      const res = await fetch("/api/user", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar_url: publicUrl }),
      });
      if (!res.ok) throw new Error((await res.json()).error);

      onAvatarChange?.(publicUrl);
      showToast("Avatar updated", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to upload avatar", "error");
    } finally {
      setUploadingAvatar(false);
      // Reset file input so same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const savePreferences = useCallback(
    async (prefs: UserPreferences) => {
      try {
        await fetch("/api/user", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ preferences: prefs }),
        });
      } catch {
        // Silently fail — preferences are still reflected in local state
      }
    },
    []
  );

  const handleThemeChange = (t: ThemeOption) => {
    setGlobalTheme(t);
    savePreferences({ theme: t, language, push_notifications: pushNotifications, email_updates: emailUpdates });
  };

  const handlePushNotificationsChange = async (v: boolean) => {
    if (v && pushSupported && pushPermission !== "granted") {
      const granted = await requestPermission();
      if (!granted) {
        showToast("Browser notification permission denied. Enable it in browser settings.", "error");
        return;
      }
    }
    setPushNotifications(v);
    savePreferences({ theme, language, push_notifications: v, email_updates: emailUpdates });
  };

  const handleEmailUpdatesChange = (v: boolean) => {
    setEmailUpdates(v);
    savePreferences({ theme, language, push_notifications: pushNotifications, email_updates: v });
  };

  const handleDeleteAccount = async () => {
    if (!deleteConfirm) {
      setDeleteConfirm(true);
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch("/api/user", { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error);
      // Sign out on client
      const supabase = createClient();
      await supabase.auth.signOut();
      onAccountDeleted?.();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed to delete account", "error");
      setDeleting(false);
      setDeleteConfirm(false);
    }
  };

  if (!open) return null;

  const modalHeight = TAB_HEIGHTS[activeTab] ?? undefined;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ background: "rgba(0, 0, 0, 0.45)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* ========== Modal container ========== */}
      <div
        className="relative flex flex-col overflow-hidden"
        style={{
          width: 650,
          height: modalHeight,
          maxHeight: "90vh",
          background: "var(--card-bg)",
          boxShadow: "inset 0px 0.5px 0px rgba(255, 255, 255, 0.08)",
          borderRadius: 13,
          fontFamily: "'Aeonik Pro', sans-serif",
          transition: "height 200ms ease",
        }}
      >
        {/* ========== Top bar with tabs ========== */}
        <div
          className="z-10 flex shrink-0 items-center"
          style={{
            height: 40,
            background: "rgba(255, 255, 255, 0.002)",
            boxShadow: "inset 0px -1px 0px #444444",
            borderRadius: "13px 13px 0 0",
          }}
        >
          {/* Tab list */}
          <div className="flex items-center" style={{ marginLeft: 8, gap: 4 }}>
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex items-center justify-center transition-colors"
                style={{
                  height: 24,
                  paddingLeft: 8,
                  paddingRight: 8,
                  background: activeTab === tab.id ? "#383838" : "transparent",
                  borderRadius: 5,
                  fontSize: 10.8,
                  lineHeight: "16px",
                  letterSpacing: "0.055px",
                  color:
                    activeTab === tab.id
                      ? "#FFFFFF"
                      : "rgba(255, 255, 255, 0.7)",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute right-3 top-[8px] flex items-center justify-center rounded transition-opacity hover:opacity-80"
            style={{ width: 24, height: 24 }}
          >
            <CloseIcon />
          </button>
        </div>

        {/* ========== Scrollable content area ========== */}
        <div className="flex-1 overflow-y-auto">
          {/* ===== Account tab ===== */}
          {activeTab === "account" && (
            <div className="relative" style={{ minHeight: 240 }}>
              {/* Hidden file input for avatar upload */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={handleAvatarUpload}
              />

              {/* Profile row — avatar + name + email */}
              <div
                className="absolute flex"
                style={{ left: 48, top: 40, gap: 69 }}
              >
                {/* Avatar */}
                <div
                  className="flex flex-col items-center"
                  style={{ width: 120 }}
                >
                  <div
                    className="relative overflow-hidden rounded-full"
                    style={{ width: 120, height: 120 }}
                  >
                    {avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={avatarUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div
                        className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#ff9a76] to-[#b57edc]"
                      >
                        <span
                          style={{
                            fontSize: 40,
                            fontWeight: 600,
                            color: "#FFFFFF",
                            fontFamily: "'Aeonik Pro', sans-serif",
                          }}
                        >
                          {getInitials(userName)}
                        </span>
                      </div>
                    )}
                    {uploadingAvatar && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                        <SpinnerIcon />
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="flex items-center justify-center transition-opacity hover:opacity-80 disabled:opacity-50"
                    style={{
                      width: 36.4,
                      height: 24,
                      marginTop: 8,
                      borderRadius: 5,
                      fontFamily: "'Inter', sans-serif",
                      fontSize: 11,
                      fontWeight: 500,
                      lineHeight: "16px",
                      letterSpacing: "0.055px",
                      color: "#FFFFFF",
                    }}
                  >
                    Edit
                  </button>
                </div>

                {/* Name field */}
                <div className="flex flex-col" style={{ width: 145, gap: 11 }}>
                  <span
                    style={{
                      fontSize: 14,
                      lineHeight: "24px",
                      letterSpacing: "-0.006px",
                      color: "#FFFFFF",
                    }}
                  >
                    Name
                  </span>
                  {editingName ? (
                    <input
                      autoFocus
                      type="text"
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveName();
                        if (e.key === "Escape") { setEditingName(false); setNameInput(userName); }
                      }}
                      className="bg-transparent outline-none"
                      style={{
                        height: 34,
                        border: "1px solid #7CC4F8",
                        borderRadius: 5,
                        paddingLeft: 13,
                        fontSize: 11,
                        lineHeight: "16px",
                        letterSpacing: "0.055px",
                        color: "#FFFFFF",
                      }}
                    />
                  ) : (
                    <div
                      className="flex items-center"
                      style={{
                        height: 34,
                        border: "1px solid rgba(222, 220, 209, 0.3)",
                        borderRadius: 5,
                        paddingLeft: 13,
                        fontSize: 11,
                        lineHeight: "16px",
                        letterSpacing: "0.055px",
                        color: "#FFFFFF",
                      }}
                    >
                      {userName}
                    </div>
                  )}
                  {editingName ? (
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveName}
                        disabled={saving}
                        className="flex items-center gap-1 text-left transition-opacity hover:opacity-80 disabled:opacity-50"
                        style={{ fontSize: 10.8, lineHeight: "16px", letterSpacing: "0.055px", color: "#10B981" }}
                      >
                        {saving && <SpinnerIcon />} Save
                      </button>
                      <button
                        onClick={() => { setEditingName(false); setNameInput(userName); }}
                        className="text-left transition-opacity hover:opacity-80"
                        style={{ fontSize: 10.8, lineHeight: "16px", letterSpacing: "0.055px", color: "var(--text-muted)" }}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setEditingName(true)}
                      className="text-left transition-opacity hover:opacity-80"
                      style={{ fontSize: 10.8, lineHeight: "16px", letterSpacing: "0.055px", color: "#7CC4F8" }}
                    >
                      Change name
                    </button>
                  )}
                </div>

                {/* Email field (read-only) */}
                <div className="flex flex-col" style={{ width: 145, gap: 11 }}>
                  <span
                    style={{
                      fontSize: 14,
                      lineHeight: "24px",
                      letterSpacing: "-0.006px",
                      color: "#FFFFFF",
                    }}
                  >
                    Email
                  </span>
                  <div
                    className="flex items-center truncate"
                    style={{
                      height: 34,
                      border: "1px solid rgba(222, 220, 209, 0.3)",
                      borderRadius: 5,
                      paddingLeft: 13,
                      paddingRight: 8,
                      fontSize: 11,
                      lineHeight: "16px",
                      letterSpacing: "0.055px",
                      color: "rgba(255, 255, 255, 0.6)",
                    }}
                  >
                    {userEmail}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ===== Preferences tab ===== */}
          {activeTab === "preferences" && (
            <div className="relative" style={{ minHeight: 635 }}>
              {/* Page heading */}
              <div
                className="absolute flex flex-col"
                style={{ left: 50, top: 32, gap: 5 }}
              >
                <span style={{ fontSize: 24, lineHeight: "36px", color: "var(--text-primary)" }}>
                  Preferences
                </span>
                <span style={{ fontSize: 13.7, lineHeight: "21px", color: "var(--text-muted)" }}>
                  Customize your Vibe3D experience
                </span>
              </div>

              {/* Appearance card */}
              <div
                className="absolute"
                style={{
                  width: 550,
                  height: 257,
                  left: 50,
                  top: 108,
                  background: "var(--card-bg-secondary)",
                  border: "1px solid var(--border-strong)",
                  borderRadius: 12,
                }}
              >
                <span
                  className="absolute"
                  style={{ left: 25, top: 25, fontSize: 13.8, lineHeight: "21px", color: "var(--text-primary)" }}
                >
                  Appearance
                </span>
                <span
                  className="absolute"
                  style={{ left: 25, top: 62, fontSize: 13.8, lineHeight: "21px", color: "var(--text-muted)" }}
                >
                  Theme
                </span>

                {/* Theme buttons */}
                <div
                  className="absolute flex"
                  style={{ left: 25, right: 27, top: 90.75, height: 47, gap: 8 }}
                >
                  {(["dark", "light", "auto"] as ThemeOption[]).map((opt) => (
                    <button
                      key={opt}
                      onClick={() => handleThemeChange(opt)}
                      className="flex flex-1 items-center justify-center capitalize transition-colors"
                      style={{
                        height: 47,
                        borderRadius: theme === opt ? 9 : 8,
                        background: theme === opt ? "var(--text-primary)" : "var(--input-bg)",
                        border: theme === opt ? "none" : "1px solid var(--border-strong)",
                        fontSize: 13.7,
                        lineHeight: "21px",
                        color: theme === opt ? "var(--card-bg)" : "var(--text-primary)",
                      }}
                    >
                      {opt}
                    </button>
                  ))}
                </div>

                <span
                  className="absolute"
                  style={{ left: 25, top: 158, fontSize: 13.7, lineHeight: "21px", color: "var(--text-muted)" }}
                >
                  Language
                </span>

                {/* Language dropdown */}
                <div
                  className="absolute flex items-center justify-between"
                  style={{
                    left: 25,
                    right: 27,
                    top: 186.75,
                    height: 45,
                    background: "var(--input-bg)",
                    border: "1px solid var(--border-strong)",
                    borderRadius: 8,
                    paddingLeft: 21,
                    paddingRight: 14,
                  }}
                >
                  <span style={{ fontSize: 13.7, lineHeight: "16px", color: "var(--text-primary)" }}>
                    {language === "en" ? "English" : language}
                  </span>
                  <ChevronDownIcon />
                </div>
              </div>

              {/* Notifications card */}
              <div
                className="absolute"
                style={{
                  left: 50,
                  right: 50,
                  top: 375,
                  height: 228,
                  background: "var(--card-bg-secondary)",
                  border: "1px solid var(--border-strong)",
                  borderRadius: 12,
                }}
              >
                <span
                  className="absolute"
                  style={{ left: 25, top: 25, fontSize: 13.7, lineHeight: "21px", color: "var(--text-primary)" }}
                >
                  Notifications
                </span>

                {/* Push notifications */}
                <div
                  className="absolute flex items-start"
                  style={{ left: 25, top: 62, right: 25, height: 66.5 }}
                >
                  <div className="flex items-center" style={{ paddingLeft: 12, paddingTop: 12 }}>
                    <Checkbox checked={pushNotifications} onChange={handlePushNotificationsChange} />
                  </div>
                  <div className="flex flex-col" style={{ marginLeft: 12 }}>
                    <span style={{ fontSize: 13.6, lineHeight: "21px", color: "var(--text-primary)", paddingTop: 12 }}>
                      Push notifications
                    </span>
                    <span style={{ fontSize: 12.8, lineHeight: "20px", color: "var(--text-muted)", marginTop: 2 }}>
                      Receive notifications about AI generation progress
                      {!pushSupported && " (not supported in this browser)"}
                      {pushSupported && pushPermission === "denied" && " (blocked in browser settings)"}
                    </span>
                  </div>
                </div>

                {/* Email updates */}
                <div
                  className="absolute flex items-start"
                  style={{ left: 25, top: 136.5, right: 25, height: 66.5 }}
                >
                  <div className="flex items-center" style={{ paddingLeft: 12, paddingTop: 12 }}>
                    <Checkbox checked={emailUpdates} onChange={handleEmailUpdatesChange} />
                  </div>
                  <div className="flex flex-col" style={{ marginLeft: 12 }}>
                    <span style={{ fontSize: 13.7, lineHeight: "21px", color: "var(--text-primary)", paddingTop: 12 }}>
                      Email updates
                    </span>
                    <span style={{ fontSize: 12.8, lineHeight: "20px", color: "var(--text-muted)", marginTop: 2 }}>
                      Receive tips, feature updates, and special offers
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ===== Billing tab ===== */}
          {activeTab === "billing" && (
            <div style={{ padding: "32px 48px 40px 50px" }}>
              {/* Page heading */}
              <div className="flex flex-col" style={{ gap: 5, marginBottom: 24 }}>
                <span style={{ fontSize: 24, lineHeight: "36px", color: "var(--text-primary)" }}>
                  Billing
                </span>
                <span style={{ fontSize: 13.7, lineHeight: "21px", color: "var(--text-muted)" }}>
                  Choose a plan that works for you
                </span>
              </div>

              {/* Monthly / Annual toggle */}
              <div className="flex items-center gap-3" style={{ marginBottom: 20 }}>
                <button
                  onClick={() => setBillingCycle("monthly")}
                  className="flex items-center justify-center transition-colors"
                  style={{
                    height: 32,
                    padding: "0 14px",
                    borderRadius: 7,
                    fontSize: 12.8,
                    lineHeight: "20px",
                    background: billingCycle === "monthly" ? "rgba(255, 255, 255, 0.12)" : "transparent",
                    color: billingCycle === "monthly" ? "#FFFFFF" : "#6B6B6B",
                    border: billingCycle === "monthly" ? "none" : "1px solid #3A3A3A",
                  }}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBillingCycle("annual")}
                  className="flex items-center justify-center gap-2 transition-colors"
                  style={{
                    height: 32,
                    padding: "0 14px",
                    borderRadius: 7,
                    fontSize: 12.8,
                    lineHeight: "20px",
                    background: billingCycle === "annual" ? "rgba(255, 255, 255, 0.12)" : "transparent",
                    color: billingCycle === "annual" ? "#FFFFFF" : "#6B6B6B",
                    border: billingCycle === "annual" ? "none" : "1px solid #3A3A3A",
                  }}
                >
                  Annual
                  <span
                    style={{
                      fontSize: 10,
                      padding: "2px 6px",
                      borderRadius: 4,
                      background: "rgba(16, 185, 129, 0.15)",
                      color: "#10B981",
                    }}
                  >
                    Save 20%
                  </span>
                </button>
              </div>

              {/* Plan cards grid */}
              <div className="grid grid-cols-2 gap-3">
                {(["free", "standard", "pro", "mega"] as const).map((tier) => {
                  const plan = PLAN_CONFIGS_LOCAL[tier];
                  const isCurrent = currentPlan === tier;
                  const price = billingCycle === "annual"
                    ? Math.round(plan.annualPrice / 12)
                    : plan.monthlyPrice;
                  const isPopular = tier === "standard";

                  return (
                    <div
                      key={tier}
                      className="relative flex flex-col"
                      style={{
                        padding: "20px 18px",
                        background: isCurrent ? "#2A2A2A" : "#252525",
                        border: isCurrent
                          ? "1.5px solid #7CC4F8"
                          : isPopular
                            ? "1.5px solid rgba(124, 196, 248, 0.3)"
                            : "1px solid #3A3A3A",
                        borderRadius: 12,
                        opacity: tier === "free" && currentPlan !== "free" ? 0.6 : 1,
                      }}
                    >
                      {/* Popular badge */}
                      {isPopular && (
                        <div
                          className="absolute flex items-center justify-center"
                          style={{
                            top: -10,
                            right: 16,
                            height: 20,
                            padding: "0 8px",
                            borderRadius: 4,
                            background: "#7CC4F8",
                            fontSize: 10,
                            fontWeight: 600,
                            color: "#000",
                          }}
                        >
                          MOST POPULAR
                        </div>
                      )}

                      {/* Current badge */}
                      {isCurrent && (
                        <div
                          className="flex items-center justify-center"
                          style={{
                            width: 82,
                            height: 22,
                            borderRadius: 5,
                            background: "rgba(124, 196, 248, 0.15)",
                            fontSize: 10,
                            fontWeight: 600,
                            color: "#7CC4F8",
                            marginBottom: 8,
                          }}
                        >
                          CURRENT
                        </div>
                      )}

                      {/* Plan name + price */}
                      <div className="flex items-baseline justify-between" style={{ marginBottom: 4 }}>
                        <span style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)" }}>
                          {plan.label}
                        </span>
                      </div>
                      <div className="flex items-baseline gap-1" style={{ marginBottom: 14 }}>
                        <span style={{ fontSize: 28, fontWeight: 700, color: "var(--text-primary)" }}>
                          ${price}
                        </span>
                        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                          /mo
                        </span>
                        {billingCycle === "annual" && plan.monthlyPrice > 0 && (
                          <span style={{ fontSize: 11, color: "var(--text-muted)", textDecoration: "line-through", marginLeft: 6 }}>
                            ${plan.monthlyPrice}
                          </span>
                        )}
                      </div>

                      {/* Generation count */}
                      <div
                        style={{
                          padding: "8px 12px",
                          background: "var(--input-bg)",
                          borderRadius: 6,
                          marginBottom: 12,
                        }}
                      >
                        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                          {plan.generationLimit >= 500
                            ? "Unlimited*"
                            : `${plan.generationLimit}`}{" "}
                          AI generations/mo
                        </span>
                      </div>

                      {/* Features */}
                      <div className="flex flex-col gap-2" style={{ marginBottom: 16 }}>
                        {plan.features.slice(1, 5).map((f, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <CircleCheckIcon />
                            <span style={{ fontSize: 11.5, lineHeight: "16px", color: "var(--text-muted)" }}>
                              {f}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Action button */}
                      <button
                        disabled={isCurrent || upgradingTier === tier}
                        onClick={async () => {
                          if (tier === "free" || isCurrent) return;
                          setUpgradingTier(tier);
                          try {
                            const res = await fetch("/api/billing/checkout", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ tier, cycle: billingCycle }),
                            });
                            const data = await res.json();
                            if (res.ok && data.checkoutUrl) {
                              window.location.href = data.checkoutUrl;
                            } else {
                              setToast({ message: data.error || "Failed to start checkout", type: "error" });
                            }
                          } catch {
                            setToast({ message: "Failed to start checkout", type: "error" });
                          } finally {
                            setUpgradingTier(null);
                          }
                        }}
                        className="mt-auto flex items-center justify-center transition-opacity hover:opacity-90"
                        style={{
                          height: 38,
                          borderRadius: 8,
                          fontSize: 12.8,
                          fontWeight: 500,
                          background: isCurrent ? "transparent" : isPopular ? "#FAF9F5" : "transparent",
                          color: isCurrent ? "#6B6B6B" : isPopular ? "#000" : "#E5E5E5",
                          border: isCurrent
                            ? "1px solid #3A3A3A"
                            : isPopular
                              ? "none"
                              : "1px solid #3A3A3A",
                          cursor: isCurrent ? "default" : "pointer",
                        }}
                      >
                        {upgradingTier === tier ? "Redirecting..." : isCurrent ? "Current Plan" : tier === "free" ? "Downgrade" : "Upgrade"}
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Usage card */}
              <div
                style={{
                  marginTop: 20,
                  padding: "18px 20px",
                  background: "var(--card-bg-secondary)",
                  border: "1px solid var(--border-strong)",
                  borderRadius: 12,
                }}
              >
                <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
                  <span style={{ fontSize: 13.7, fontWeight: 500, color: "var(--text-primary)" }}>
                    Generation Usage
                  </span>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    {generationsUsed} / {PLAN_CONFIGS_LOCAL[currentPlan].generationLimit >= 500 ? "\u221E" : PLAN_CONFIGS_LOCAL[currentPlan].generationLimit}
                  </span>
                </div>
                {/* Progress bar */}
                <div
                  style={{
                    height: 6,
                    background: "var(--input-bg)",
                    borderRadius: 3,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${Math.min(100, (generationsUsed / Math.max(1, PLAN_CONFIGS_LOCAL[currentPlan].generationLimit)) * 100)}%`,
                      background: generationsUsed >= PLAN_CONFIGS_LOCAL[currentPlan].generationLimit ? "#EF4444" : "#7CC4F8",
                      borderRadius: 3,
                      transition: "width 300ms ease",
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ===== Danger Zone tab ===== */}
          {activeTab === "danger-zone" && (
            <div style={{ padding: "32px 48px 40px 50px" }}>
              {/* Page heading */}
              <div className="flex flex-col" style={{ gap: 5, marginBottom: 24 }}>
                <span style={{ fontSize: 24, lineHeight: "36px", color: "var(--text-primary)" }}>
                  Danger Zone
                </span>
                <span style={{ fontSize: 13.7, lineHeight: "21px", color: "var(--text-muted)" }}>
                  Irreversible and destructive actions
                </span>
              </div>

              {/* Delete Account card */}
              <div
                style={{
                  background: "var(--card-bg-secondary)",
                  border: "1px solid var(--border-strong)",
                  borderRadius: 12,
                  padding: 25,
                }}
              >
                <div className="flex flex-col" style={{ gap: 18 }}>
                  {/* Title row: Warning icon + "Delete Account" */}
                  <div className="flex items-center" style={{ gap: 16 }}>
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 20 20"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className="shrink-0"
                    >
                      <path
                        d="M10 3L18.33 17.5H1.67L10 3Z"
                        stroke="#EF4444"
                        strokeWidth="1.667"
                        strokeLinejoin="round"
                        fill="none"
                      />
                      <path
                        d="M10 8.5V12"
                        stroke="#EF4444"
                        strokeWidth="1.667"
                        strokeLinecap="round"
                      />
                      <circle cx="10" cy="14.5" r="0.833" fill="#EF4444" />
                    </svg>

                    <span style={{ fontSize: 15.4, lineHeight: "24px", color: "#EF4444" }}>
                      Delete Account
                    </span>
                  </div>

                  {/* Description */}
                  <span style={{ fontSize: 13.6, lineHeight: "22px", color: "var(--text-primary)" }}>
                    Once you delete your account, there is no going back. This
                    will permanently delete:
                  </span>

                  {/* Bullet list */}
                  <div style={{ fontSize: 13.6, lineHeight: "25px", color: "var(--text-muted)" }}>
                    • All your 3D models and projects
                    <br />
                    • Your account data and settings
                    <br />
                    • Your billing history and subscription
                    <br />
                    • All AI generation history
                  </div>

                  {/* Delete button */}
                  <button
                    onClick={handleDeleteAccount}
                    disabled={deleting}
                    className="relative flex items-center justify-center transition-opacity hover:opacity-90 disabled:opacity-50"
                    style={{
                      width: deleteConfirm ? 260 : 203.11,
                      height: 45,
                      background: "#EF4444",
                      borderRadius: 8,
                      transition: "width 200ms ease",
                    }}
                  >
                    {deleting ? (
                      <SpinnerIcon />
                    ) : (
                      <>
                        {/* Trash icon */}
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 20 20"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                          style={{
                            position: "absolute",
                            left: 24,
                            top: "calc(50% - 10px)",
                          }}
                        >
                          <path d="M3.5 5H16.5" stroke="#FFFFFF" strokeWidth="1.667" strokeLinecap="round" />
                          <path d="M5 5V16C5 17.1 5.9 18 7 18H13C14.1 18 15 17.1 15 16V5" stroke="#FFFFFF" strokeWidth="1.667" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M8 2H12C12.55 2 13 2.45 13 3V5H7V3C7 2.45 7.45 2 8 2Z" stroke="#FFFFFF" strokeWidth="1.667" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>

                        <span
                          style={{
                            fontSize: 13.7,
                            lineHeight: "21px",
                            color: "#FFFFFF",
                            marginLeft: 28,
                          }}
                        >
                          {deleteConfirm ? "Click again to confirm" : "Delete My Account"}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Toast notification */}
        {toast && <StatusToast message={toast.message} type={toast.type} />}
      </div>
    </div>
  );
}
