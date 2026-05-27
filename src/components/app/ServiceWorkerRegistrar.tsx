"use client";

/**
 * Registers the ParkShare service worker on every app page.
 * Renders nothing. Mounted in the app layout so the SW is available
 * even when the user hasn't visited the dashboard yet.
 */

import { useEffect } from "react";

export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((err) => {
      console.error("[ServiceWorkerRegistrar] Failed:", err);
    });
  }, []);

  return null;
}
