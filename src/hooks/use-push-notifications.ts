"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface UsePushNotificationsReturn {
  /** Whether the browser supports notifications */
  supported: boolean;
  /** Current permission state */
  permission: NotificationPermission | "unsupported";
  /** Request notification permission from the user */
  requestPermission: () => Promise<boolean>;
  /** Send a notification (if permitted) */
  notify: (title: string, options?: NotificationOptions) => void;
}

export function usePushNotifications(): UsePushNotificationsReturn {
  const [supported] = useState(
    () => typeof window !== "undefined" && "Notification" in window
  );
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(
    () => {
      if (typeof window === "undefined" || !("Notification" in window))
        return "unsupported";
      return Notification.permission;
    }
  );

  // Keep permission state in sync (user may change it in browser settings)
  useEffect(() => {
    if (!supported) return;
    // Permissions API provides a change listener
    if ("permissions" in navigator) {
      navigator.permissions.query({ name: "notifications" }).then((status) => {
        setPermission(status.state === "prompt" ? "default" : status.state === "granted" ? "granted" : "denied");
        status.addEventListener("change", () => {
          setPermission(
            status.state === "prompt" ? "default" : status.state === "granted" ? "granted" : "denied"
          );
        });
      }).catch(() => {
        // Fallback — just use current value
      });
    }
  }, [supported]);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!supported) return false;
    if (Notification.permission === "granted") {
      setPermission("granted");
      return true;
    }
    if (Notification.permission === "denied") {
      setPermission("denied");
      return false;
    }
    const result = await Notification.requestPermission();
    setPermission(result);
    return result === "granted";
  }, [supported]);

  // Track active notification to avoid spamming
  const activeRef = useRef<Notification | null>(null);

  const notify = useCallback(
    (title: string, options?: NotificationOptions) => {
      if (!supported || Notification.permission !== "granted") return;

      // Close previous notification if still open
      if (activeRef.current) {
        try { activeRef.current.close(); } catch { /* ignore */ }
      }

      const notification = new Notification(title, {
        icon: "/assets/icons/logo-gem.svg",
        badge: "/assets/icons/logo-gem.svg",
        ...options,
      });

      activeRef.current = notification;

      // Focus window when notification is clicked
      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      // Auto-close after 8 seconds
      setTimeout(() => {
        try { notification.close(); } catch { /* ignore */ }
      }, 8000);
    },
    [supported]
  );

  return { supported, permission, requestPermission, notify };
}
