"use client";

/**
 * PushNotificationManager
 *
 * Invisible client component that:
 * 1. Registers /sw.js on mount (idempotent — safe to call multiple times)
 * 2. Tracks the current Notification.permission state
 * 3. Exposes requestAndSubscribe() — requests permission, creates a Web Push
 *    subscription with the VAPID public key, and persists it to Supabase via
 *    POST /api/notifications/subscribe
 *
 * Usage:
 *   <PushNotificationManager onStateChange={(s) => setNotifState(s)} />
 *
 * onStateChange fires whenever state changes. State shape:
 *   { permission: NotificationPermission; subscribed: boolean; loading: boolean }
 *
 * To trigger enrollment, call requestAndSubscribe() from the returned ref or
 * wire up a button with the onRequestSubscribe prop.
 */

import { useEffect, useRef, useCallback, useState } from "react";

export interface PushNotifState {
  permission: NotificationPermission | "unsupported";
  subscribed: boolean;
  loading: boolean;
  error?: string;
}

interface Props {
  onStateChange?: (state: PushNotifState) => void;
  /** Called once the manager is ready — receives the requestAndSubscribe fn */
  onReady?: (requestAndSubscribe: () => Promise<void>) => void;
}

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;

/** Convert a base64url VAPID public key to the Uint8Array that pushManager expects */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

export function PushNotificationManager({ onStateChange, onReady }: Props) {
  const swReg = useRef<ServiceWorkerRegistration | null>(null);
  const [state, setState] = useState<PushNotifState>(() => ({
    permission:
      typeof Notification !== "undefined"
        ? Notification.permission
        : "unsupported",
    subscribed: false,
    loading: false,
  }));

  // Keep parent in sync whenever local state changes
  useEffect(() => {
    onStateChange?.(state);
  }, [state, onStateChange]);

  // Register service worker on mount
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then(async (reg) => {
        swReg.current = reg;

        // Check if already subscribed
        const existing = await reg.pushManager.getSubscription();
        if (existing) {
          setState((s) => ({ ...s, subscribed: true }));
        }
      })
      .catch((err) => {
        console.error("[PushNotificationManager] SW registration failed:", err);
      });
  }, []);

  const requestAndSubscribe = useCallback(async () => {
    if (!swReg.current) {
      console.warn("[PushNotificationManager] SW not registered yet");
      return;
    }

    setState((s) => ({ ...s, loading: true }));

    try {
      // 1. Drop any existing subscription first — avoids "key mismatch" errors
      //    when the VAPID key has changed since the last install.
      const existing = await swReg.current.pushManager.getSubscription();
      if (existing) await existing.unsubscribe();

      // 2. Create a fresh push subscription.
      //    On iOS Safari PWA, pushManager.subscribe() handles the permission
      //    prompt internally — calling Notification.requestPermission() first
      //    throws "Can't find variable: notification" due to a WebKit bug.
      //    On other browsers, subscribe() also implicitly requests permission.
      const keyBytes = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      const subscription = await swReg.current.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: keyBytes.buffer as ArrayBuffer,
      });

      // Sync the permission state after subscribe (works on all platforms)
      if (typeof Notification !== "undefined") {
        setState((s) => ({ ...s, permission: Notification.permission }));
      }

      const json = subscription.toJSON();

      // 3. Persist to Supabase via API route
      const res = await fetch("/api/notifications/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: json.endpoint,
          keys: json.keys,
        }),
      });

      if (!res.ok) {
        throw new Error(`Subscribe API returned ${res.status}`);
      }

      setState((s) => ({ ...s, subscribed: true, loading: false }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[PushNotificationManager] Subscribe failed:", msg);
      setState((s) => ({ ...s, loading: false, error: msg }));
    }
  }, []);

  // Expose requestAndSubscribe once ready
  useEffect(() => {
    onReady?.(requestAndSubscribe);
  }, [onReady, requestAndSubscribe]);

  // Nothing to render — this is a side-effect manager
  return null;
}
