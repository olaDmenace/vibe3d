"use client";

import { useState } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  userName: string;
  userEmail: string;
  avatarUrl?: string;
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
  account: 382,
  preferences: 675,
  billing: 1028,
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

function LockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <rect x="3" y="8" width="12" height="8.5" rx="2" stroke="#E5E5E5" strokeWidth="1.49" />
      <path
        d="M6 8V5.5C6 3.84 7.34 2.5 9 2.5C10.66 2.5 12 3.84 12 5.5V8"
        stroke="#E5E5E5"
        strokeWidth="1.49"
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
/*  Billing sub-components                                             */
/* ------------------------------------------------------------------ */

/** A single row in the billing history list. */
function BillingHistoryRow({
  date,
  plan,
  amount,
}: {
  date: string;
  plan: string;
  amount: string;
}) {
  return (
    <div
      className="relative"
      style={{
        height: 72,
        background: "#1A1A1A",
        borderRadius: 8,
      }}
    >
      {/* Date */}
      <span
        className="absolute"
        style={{ left: 16, top: 15.5, fontSize: 13.7, lineHeight: "21px", color: "#E5E5E5" }}
      >
        {date}
      </span>
      {/* Plan */}
      <span
        className="absolute"
        style={{ left: 16, top: 36.5, fontSize: 12.8, lineHeight: "20px", color: "#6B6B6B" }}
      >
        {plan}
      </span>
      {/* Amount */}
      <span
        className="absolute"
        style={{ left: 261.8, top: 23.75, fontSize: 15.5, lineHeight: "24px", color: "#E5E5E5" }}
      >
        {amount}
      </span>
      {/* Paid badge */}
      <div
        className="absolute flex items-center justify-center"
        style={{
          left: 332.38,
          top: "calc(50% - 13px)",
          width: 49.58,
          height: 26,
          background: "rgba(16, 185, 129, 0.125)",
          borderRadius: 6,
        }}
      >
        <span style={{ fontSize: 12, lineHeight: "18px", color: "#10B981" }}>Paid</span>
      </div>
      {/* Download button */}
      <button
        className="absolute flex items-center justify-center transition-opacity hover:opacity-80"
        style={{
          width: 86.05,
          height: 33.5,
          left: 397.95,
          top: "calc(50% - 16.75px)",
          border: "1px solid #3A3A3A",
          borderRadius: 6,
          fontSize: 12.9,
          lineHeight: "20px",
          color: "#A3A3A3",
        }}
      >
        Download
      </button>
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
}: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>("account");
  const [theme, setTheme] = useState<ThemeOption>("dark");
  const [pushNotifications, setPushNotifications] = useState(true);
  const [emailUpdates, setEmailUpdates] = useState(false);

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
          background: "#2C2C2C",
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
            <div className="relative" style={{ minHeight: 342 }}>
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
                    className="overflow-hidden rounded-full bg-gradient-to-br from-[#ff9a76] to-[#b57edc]"
                    style={{ width: 120, height: 120 }}
                  >
                    {avatarUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={avatarUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    )}
                  </div>
                  <button
                    className="flex items-center justify-center transition-opacity hover:opacity-80"
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
                  <button
                    className="text-left transition-opacity hover:opacity-80"
                    style={{
                      fontSize: 10.8,
                      lineHeight: "16px",
                      letterSpacing: "0.055px",
                      color: "#7CC4F8",
                    }}
                  >
                    Change name
                  </button>
                </div>

                {/* Email field */}
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
                      color: "#FFFFFF",
                    }}
                  >
                    {userEmail}
                  </div>
                  <button
                    className="text-left transition-opacity hover:opacity-80"
                    style={{
                      fontSize: 10.8,
                      lineHeight: "16px",
                      letterSpacing: "0.055px",
                      color: "#7CC4F8",
                    }}
                  >
                    Change email
                  </button>
                </div>
              </div>

              {/* Password section */}
              <div
                className="absolute"
                style={{
                  width: 548,
                  height: 95,
                  left: "calc(50% - 548px/2)",
                  top: 212,
                  background: "#252525",
                  border: "1px solid #3A3A3A",
                  borderRadius: 12,
                }}
              >
                <span
                  className="absolute"
                  style={{ left: 25, top: 25, fontSize: 13.8, lineHeight: "21px", color: "#E5E5E5" }}
                >
                  Password
                </span>
                <span
                  className="absolute"
                  style={{ left: 25, top: 50, fontSize: 12.8, lineHeight: "20px", color: "#6B6B6B" }}
                >
                  Last changed 3 months ago
                </span>
                <button
                  className="absolute flex items-center justify-center gap-2 transition-opacity hover:opacity-80"
                  style={{
                    width: 168.51,
                    height: 38.51,
                    left: 353.64,
                    top: "calc(50% - 38.51px/2 + 1px)",
                    background: "#1A1A1A",
                    border: "0.9px solid #3A3A3A",
                    borderRadius: 5.37,
                  }}
                >
                  <LockIcon />
                  <span style={{ fontSize: 12.27, lineHeight: "19px", color: "#E5E5E5" }}>
                    Change Password
                  </span>
                </button>
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
                <span style={{ fontSize: 24, lineHeight: "36px", color: "#E5E5E5" }}>
                  Preferences
                </span>
                <span style={{ fontSize: 13.7, lineHeight: "21px", color: "#A3A3A3" }}>
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
                  background: "#252525",
                  border: "1px solid #3A3A3A",
                  borderRadius: 12,
                }}
              >
                <span
                  className="absolute"
                  style={{ left: 25, top: 25, fontSize: 13.8, lineHeight: "21px", color: "#E5E5E5" }}
                >
                  Appearance
                </span>
                <span
                  className="absolute"
                  style={{ left: 25, top: 62, fontSize: 13.8, lineHeight: "21px", color: "#A3A3A3" }}
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
                      onClick={() => setTheme(opt)}
                      className="flex flex-1 items-center justify-center capitalize transition-colors"
                      style={{
                        height: 47,
                        borderRadius: theme === opt ? 9 : 8,
                        background: theme === opt ? "#FAF9F5" : "#1A1A1A",
                        border: theme === opt ? "none" : "1px solid #3A3A3A",
                        fontSize: 13.7,
                        lineHeight: "21px",
                        color: theme === opt ? "#000000" : "#E5E5E5",
                      }}
                    >
                      {opt}
                    </button>
                  ))}
                </div>

                <span
                  className="absolute"
                  style={{ left: 25, top: 158, fontSize: 13.7, lineHeight: "21px", color: "#A3A3A3" }}
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
                    background: "#1A1A1A",
                    border: "1px solid #3A3A3A",
                    borderRadius: 8,
                    paddingLeft: 21,
                    paddingRight: 14,
                  }}
                >
                  <span style={{ fontSize: 13.7, lineHeight: "16px", color: "#E5E5E5" }}>
                    English
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
                  background: "#252525",
                  border: "1px solid #3A3A3A",
                  borderRadius: 12,
                }}
              >
                <span
                  className="absolute"
                  style={{ left: 25, top: 25, fontSize: 13.7, lineHeight: "21px", color: "#E5E5E5" }}
                >
                  Notifications
                </span>

                {/* Push notifications */}
                <div
                  className="absolute flex items-start"
                  style={{ left: 25, top: 62, right: 25, height: 66.5 }}
                >
                  <div className="flex items-center" style={{ paddingLeft: 12, paddingTop: 12 }}>
                    <Checkbox checked={pushNotifications} onChange={setPushNotifications} />
                  </div>
                  <div className="flex flex-col" style={{ marginLeft: 12 }}>
                    <span style={{ fontSize: 13.6, lineHeight: "21px", color: "#E5E5E5", paddingTop: 12 }}>
                      Push notifications
                    </span>
                    <span style={{ fontSize: 12.8, lineHeight: "20px", color: "#6B6B6B", marginTop: 2 }}>
                      Receive notifications about AI generation progress
                    </span>
                  </div>
                </div>

                {/* Email updates */}
                <div
                  className="absolute flex items-start"
                  style={{ left: 25, top: 136.5, right: 25, height: 66.5 }}
                >
                  <div className="flex items-center" style={{ paddingLeft: 12, paddingTop: 12 }}>
                    <Checkbox checked={emailUpdates} onChange={setEmailUpdates} />
                  </div>
                  <div className="flex flex-col" style={{ marginLeft: 12 }}>
                    <span style={{ fontSize: 13.7, lineHeight: "21px", color: "#E5E5E5", paddingTop: 12 }}>
                      Email updates
                    </span>
                    <span style={{ fontSize: 12.8, lineHeight: "20px", color: "#6B6B6B", marginTop: 2 }}>
                      Receive tips, feature updates, and special offers
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ===== Billing tab ===== */}
          {activeTab === "billing" && (
            <div className="relative" style={{ minHeight: 988 }}>
              {/* Page heading */}
              <div
                className="absolute flex flex-col"
                style={{ left: 50, top: 32, gap: 5 }}
              >
                <span style={{ fontSize: 24, lineHeight: "36px", color: "#E5E5E5" }}>
                  Billing
                </span>
                <span style={{ fontSize: 13.7, lineHeight: "21px", color: "#A3A3A3" }}>
                  Manage your subscription and payments
                </span>
              </div>

              {/* ---- Current Plan card ---- */}
              <div
                className="absolute"
                style={{
                  width: 549,
                  height: 344,
                  left: 48,
                  top: 111,
                  background: "#252525",
                  border: "1px solid #3A3A3A",
                  borderRadius: 12,
                }}
              >
                {/* CURRENT PLAN badge */}
                <div
                  className="absolute flex items-center justify-center"
                  style={{
                    left: 26,
                    top: 27,
                    width: 109,
                    height: 26,
                    background: "rgba(255, 255, 255, 0.125)",
                    borderRadius: 6,
                  }}
                >
                  <span style={{ fontSize: 12, lineHeight: "18px", color: "#FFFFFF" }}>
                    CURRENT PLAN
                  </span>
                </div>

                {/* Plan name */}
                <span
                  className="absolute"
                  style={{ left: 26, top: 60.5, fontSize: 24, lineHeight: "36px", color: "#E5E5E5" }}
                >
                  Pro Plan
                </span>

                {/* Price */}
                <span
                  className="absolute text-right"
                  style={{ right: 38.8, top: 26.75, fontSize: 32, lineHeight: "48px", color: "#E5E5E5" }}
                >
                  $29
                </span>
                <span
                  className="absolute text-right"
                  style={{ right: 38.8, top: 74.75, fontSize: 13.7, lineHeight: "21px", color: "#6B6B6B" }}
                >
                  per month
                </span>

                {/* Features box */}
                <div
                  className="absolute"
                  style={{
                    left: 26,
                    right: 24,
                    top: 113,
                    height: 138,
                    background: "#1A1A1A",
                    borderRadius: 8,
                  }}
                >
                  {/* Includes label */}
                  <span
                    className="absolute"
                    style={{ left: 16, top: 15.5, fontSize: 12.8, lineHeight: "20px", color: "#6B6B6B" }}
                  >
                    Includes:
                  </span>

                  {/* Feature 1 */}
                  <div
                    className="absolute flex items-center gap-[24px]"
                    style={{ left: 16, top: 53.5 }}
                  >
                    <CircleCheckIcon />
                    <span style={{ fontSize: 13.7, lineHeight: "21px", color: "#E5E5E5" }}>
                      Unlimited AI generations
                    </span>
                  </div>

                  {/* Feature 2 */}
                  <div
                    className="absolute flex items-center gap-[24px]"
                    style={{ left: 16, top: 82.5 }}
                  >
                    <CircleCheckIcon />
                    <span style={{ fontSize: 13.6, lineHeight: "21px", color: "#E5E5E5" }}>
                      Export to all formats (GLB, FBX, OBJ)
                    </span>
                  </div>

                  {/* Feature 3 */}
                  <div
                    className="absolute flex items-center gap-[24px]"
                    style={{ left: 16, top: 111.5 }}
                  >
                    <CircleCheckIcon />
                    <span style={{ fontSize: 13.6, lineHeight: "21px", color: "#E5E5E5" }}>
                      Priority support
                    </span>
                  </div>
                </div>

                {/* Action buttons */}
                <button
                  className="absolute flex items-center justify-center transition-opacity hover:opacity-90"
                  style={{
                    left: 26,
                    right: 123,
                    top: 270,
                    height: 47,
                    background: "#FAF9F5",
                    borderRadius: 9,
                    fontSize: 13.7,
                    lineHeight: "21px",
                    color: "#000000",
                  }}
                >
                  Upgrade to Annual (Save 20%)
                </button>
                <button
                  className="absolute flex items-center justify-center transition-opacity hover:opacity-80"
                  style={{
                    width: 87.35,
                    height: 47,
                    left: 438,
                    top: 270,
                    border: "1px solid #3A3A3A",
                    borderRadius: 8,
                    fontSize: 13.7,
                    lineHeight: "21px",
                    color: "#A3A3A3",
                  }}
                >
                  Cancel
                </button>
              </div>

              {/* ---- Payment Method card ---- */}
              <div
                className="absolute"
                style={{
                  width: 549,
                  left: 48,
                  top: 465,
                  height: 160,
                  background: "#252525",
                  border: "1px solid #3A3A3A",
                  borderRadius: 12,
                }}
              >
                {/* Title */}
                <span
                  className="absolute"
                  style={{
                    left: 25,
                    top: 25,
                    fontFamily: "'SF Pro', 'Aeonik Pro', sans-serif",
                    fontWeight: 590,
                    fontSize: 13.7,
                    lineHeight: "21px",
                    color: "#E5E5E5",
                  }}
                >
                  Payment Method
                </span>

                {/* Card details row */}
                <div
                  className="absolute"
                  style={{
                    left: 25,
                    right: 25,
                    top: 62,
                    height: 73,
                    background: "#1A1A1A",
                    borderRadius: 8,
                  }}
                >
                  {/* VISA badge */}
                  <div
                    className="absolute flex items-center justify-center"
                    style={{
                      left: 16,
                      top: "calc(50% - 16px + 0.75px)",
                      width: 48,
                      height: 32,
                      background: "#252525",
                      borderRadius: 4,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "'SF Pro', sans-serif",
                        fontWeight: 700,
                        fontSize: 10,
                        lineHeight: "15px",
                        color: "#E5E5E5",
                      }}
                    >
                      VISA
                    </span>
                  </div>

                  {/* Card number */}
                  <span
                    className="absolute"
                    style={{ left: 80, top: 16, fontSize: 13.7, lineHeight: "21px", color: "#E5E5E5" }}
                  >
                    •••• •••• •••• 4242
                  </span>
                  {/* Expiry */}
                  <span
                    className="absolute"
                    style={{ left: 80, top: 37, fontSize: 12.8, lineHeight: "20px", color: "#6B6B6B" }}
                  >
                    Expires 12/2025
                  </span>

                  {/* Update button */}
                  <button
                    className="absolute flex items-center justify-center transition-opacity hover:opacity-80"
                    style={{
                      width: 78.28,
                      height: 37.5,
                      left: 405.72,
                      top: "calc(50% - 18.75px + 0.75px)",
                      background: "#252525",
                      border: "1px solid #3A3A3A",
                      borderRadius: 6,
                      fontSize: 12.9,
                      lineHeight: "20px",
                      color: "#E5E5E5",
                    }}
                  >
                    Update
                  </button>
                </div>
              </div>

              {/* ---- Billing History card ---- */}
              <div
                className="absolute"
                style={{
                  width: 549,
                  left: 48,
                  top: 635,
                  height: 320,
                  background: "#252525",
                  border: "1px solid #3A3A3A",
                  borderRadius: 12,
                }}
              >
                {/* Title */}
                <span
                  className="absolute"
                  style={{ left: 25, top: 24.5, fontSize: 13.7, lineHeight: "21px", color: "#E5E5E5" }}
                >
                  Billing History
                </span>

                {/* Invoice rows */}
                <div
                  className="absolute flex flex-col"
                  style={{ left: 25, right: 25, top: 61.75, gap: 8 }}
                >
                  <BillingHistoryRow date="Feb 1, 2026" plan="Pro Plan" amount="$29.00" />
                  <BillingHistoryRow date="Jan 1, 2026" plan="Pro Plan" amount="$29.00" />
                  <BillingHistoryRow date="Dec 1, 2025" plan="Pro Plan" amount="$29.00" />
                </div>
              </div>
            </div>
          )}

          {/* ===== Danger Zone tab ===== */}
          {activeTab === "danger-zone" && (
            <div style={{ padding: "32px 48px 40px 50px" }}>
              {/* Page heading */}
              <div className="flex flex-col" style={{ gap: 5, marginBottom: 24 }}>
                <span style={{ fontSize: 24, lineHeight: "36px", color: "#E5E5E5" }}>
                  Danger Zone
                </span>
                <span style={{ fontSize: 13.7, lineHeight: "21px", color: "#A3A3A3" }}>
                  Irreversible and destructive actions
                </span>
              </div>

              {/* Delete Account card */}
              <div
                style={{
                  background: "#252525",
                  border: "1px solid #3A3A3A",
                  borderRadius: 12,
                  padding: 25,
                }}
              >
                <div className="flex flex-col" style={{ gap: 18 }}>
                  {/* Title row: Warning icon + "Delete Account" */}
                  <div className="flex items-center" style={{ gap: 16 }}>
                    {/* Warning triangle icon */}
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
                  <span style={{ fontSize: 13.6, lineHeight: "22px", color: "#E5E5E5" }}>
                    Once you delete your account, there is no going back. This
                    will permanently delete:
                  </span>

                  {/* Bullet list */}
                  <div style={{ fontSize: 13.6, lineHeight: "25px", color: "#A3A3A3" }}>
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
                    className="relative flex items-center justify-center transition-opacity hover:opacity-90"
                    style={{
                      width: 203.11,
                      height: 45,
                      background: "#EF4444",
                      borderRadius: 8,
                    }}
                  >
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
                      <path
                        d="M3.5 5H16.5"
                        stroke="#FFFFFF"
                        strokeWidth="1.667"
                        strokeLinecap="round"
                      />
                      <path
                        d="M5 5V16C5 17.1 5.9 18 7 18H13C14.1 18 15 17.1 15 16V5"
                        stroke="#FFFFFF"
                        strokeWidth="1.667"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M8 2H12C12.55 2 13 2.45 13 3V5H7V3C7 2.45 7.45 2 8 2Z"
                        stroke="#FFFFFF"
                        strokeWidth="1.667"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>

                    <span
                      style={{
                        fontSize: 13.7,
                        lineHeight: "21px",
                        color: "#FFFFFF",
                        marginLeft: 28,
                      }}
                    >
                      Delete My Account
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
