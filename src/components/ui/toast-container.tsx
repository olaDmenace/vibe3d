"use client";

import { useToastStore } from "@/store/toast-store";

const TYPE_STYLES: Record<string, { bg: string; border: string; icon: string }> = {
  success: { bg: "rgba(16, 185, 129, 0.12)", border: "rgba(16, 185, 129, 0.3)", icon: "\u2713" },
  error:   { bg: "rgba(239, 68, 68, 0.12)",  border: "rgba(239, 68, 68, 0.3)",  icon: "\u2717" },
  warning: { bg: "rgba(245, 158, 11, 0.12)", border: "rgba(245, 158, 11, 0.3)", icon: "\u26A0" },
  info:    { bg: "rgba(99, 102, 241, 0.12)",  border: "rgba(99, 102, 241, 0.3)", icon: "\u2139" },
};

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const removeToast = useToastStore((s) => s.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        pointerEvents: "none",
      }}
    >
      {toasts.map((t) => {
        const styles = TYPE_STYLES[t.type] || TYPE_STYLES.info;
        return (
          <div
            key={t.id}
            className="animate-in"
            style={{
              pointerEvents: "auto",
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 16px",
              borderRadius: 10,
              background: styles.bg,
              border: `1px solid ${styles.border}`,
              backdropFilter: "blur(16px)",
              maxWidth: 360,
              fontFamily: "'Spline Sans', sans-serif",
              fontSize: 12,
              color: "rgba(255, 255, 255, 0.85)",
              cursor: "pointer",
            }}
            onClick={() => removeToast(t.id)}
          >
            <span style={{ fontSize: 14, flexShrink: 0 }}>{styles.icon}</span>
            <span>{t.message}</span>
          </div>
        );
      })}
    </div>
  );
}
