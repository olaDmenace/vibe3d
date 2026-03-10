"use client";

import { useEffect, useRef } from "react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "default";
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  // Focus confirm button on open
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => confirmRef.current?.focus());
    }
  }, [open]);

  // Escape to cancel
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onCancel]);

  if (!open) return null;

  const isDanger = variant === "danger";

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        className="flex flex-col gap-4 p-6"
        style={{
          width: 400,
          background: "var(--card-bg)",
          border: "1px solid var(--border-strong)",
          borderRadius: 16,
          animation: "scale-in 150ms ease-out",
        }}
      >
        {/* Title */}
        <h3
          style={{
            fontSize: 16,
            fontWeight: 600,
            color: "var(--text-primary)",
            margin: 0,
          }}
        >
          {title}
        </h3>

        {/* Message */}
        <p
          style={{
            fontSize: 13,
            lineHeight: "20px",
            color: "rgba(255,255,255,0.6)",
            margin: 0,
          }}
        >
          {message}
        </p>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            onClick={onCancel}
            className="flex h-9 items-center rounded-lg px-4 text-[12px] text-white/60 transition-colors hover:bg-white/5"
            style={{ border: "1px solid #3A3A3A" }}
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            onClick={onConfirm}
            className={`flex h-9 items-center rounded-lg px-4 text-[12px] font-medium transition-colors ${
              isDanger
                ? "bg-red-500/90 text-white hover:bg-red-500"
                : "text-black hover:opacity-90"
            }`}
            style={isDanger ? undefined : { background: "#FAF9F5" }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>

    </div>
  );
}

/**
 * Alert dialog — single button acknowledgement (replaces browser alert()).
 */
interface AlertDialogProps {
  open: boolean;
  title: string;
  message: string;
  buttonLabel?: string;
  onClose: () => void;
}

export function AlertDialog({
  open,
  title,
  message,
  buttonLabel = "OK",
  onClose,
}: AlertDialogProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="flex flex-col gap-4 p-6"
        style={{
          width: 400,
          background: "var(--card-bg)",
          border: "1px solid var(--border-strong)",
          borderRadius: 16,
          animation: "scale-in 150ms ease-out",
        }}
      >
        <h3
          style={{
            fontSize: 16,
            fontWeight: 600,
            color: "var(--text-primary)",
            margin: 0,
          }}
        >
          {title}
        </h3>
        <p
          style={{
            fontSize: 13,
            lineHeight: "20px",
            color: "rgba(255,255,255,0.6)",
            margin: 0,
          }}
        >
          {message}
        </p>
        <div className="flex items-center justify-end pt-1">
          <button
            onClick={onClose}
            autoFocus
            className="flex h-9 items-center rounded-lg px-4 text-[12px] font-medium text-black transition-colors hover:opacity-90"
            style={{ background: "#FAF9F5" }}
          >
            {buttonLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
