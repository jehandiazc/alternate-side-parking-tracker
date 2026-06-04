"use client";

import { useState, useEffect } from "react";
import { Share, Download, X } from "lucide-react";

type Platform = "ios" | "android" | "other";

function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua)) return "ios";
  if (/Android/.test(ua)) return "android";
  return "other";
}

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (navigator as any).standalone === true
  );
}

export function PWAInstallBanner() {
  const [show, setShow] = useState(false);
  const [platform, setPlatform] = useState<Platform>("other");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // Allow ?reset to clear the dismissed flag — useful for re-onboarding
    // after deleting and reinstalling the PWA from the home screen.
    if (new URLSearchParams(window.location.search).has("reset")) {
      localStorage.removeItem("pwa-banner-dismissed");
    }

    // Don't show if already installed or user dismissed before
    if (isStandalone()) return;
    if (localStorage.getItem("pwa-banner-dismissed")) return;

    const p = detectPlatform();
    setPlatform(p);

    if (p === "ios") {
      // iOS has no install event — show the manual instructions banner
      setShow(true);
    } else if (p === "android") {
      // Android: wait for browser's install prompt
      const handler = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e);
        setShow(true);
      };
      window.addEventListener("beforeinstallprompt", handler);
      return () => window.removeEventListener("beforeinstallprompt", handler);
    }
    // Desktop / other: don't show
  }, []);

  function dismiss() {
    localStorage.setItem("pwa-banner-dismissed", "1");
    setShow(false);
  }

  async function installAndroid() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      localStorage.setItem("pwa-banner-dismissed", "1");
    }
    setShow(false);
    setDeferredPrompt(null);
  }

  if (!show) return null;

  return (
    <div
      className="fixed bottom-0 inset-x-0 z-[9999] px-4 pointer-events-none"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom), 16px)" }}
    >
      <div
        className="pointer-events-auto mx-auto max-w-sm rounded-[var(--radius-xl)] p-4 flex items-start gap-3"
        style={{
          background: "rgba(250,248,244,0.97)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          boxShadow: "0 8px 32px rgba(26,26,46,0.18), 0 0 0 1px rgba(26,26,46,0.08)",
        }}
      >
        {/* Icon */}
        <div className="flex-shrink-0 w-10 h-10 rounded-[10px] bg-[--color-primary] flex items-center justify-center text-lg">
          🚗
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-[--color-text-primary] leading-snug">
            Install ParkShare
          </p>

          {platform === "ios" ? (
            <p className="text-xs text-[--color-text-secondary] mt-0.5 leading-snug">
              Tap{" "}
              <Share size={11} className="inline relative -top-px mx-0.5" />
              {" "}then{" "}
              <strong className="font-semibold text-[--color-text-primary]">
                Add to Home Screen
              </strong>{" "}
              for push notifications and the full app experience.
            </p>
          ) : (
            <p className="text-xs text-[--color-text-secondary] mt-0.5 leading-snug">
              Add to your home screen for push notifications and the full app
              experience.
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex-shrink-0 flex items-center gap-2">
          {platform === "android" && (
            <button
              onClick={installAndroid}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-md)] bg-[--color-primary] text-white text-xs font-bold"
            >
              <Download size={12} />
              Install
            </button>
          )}
          <button
            onClick={dismiss}
            className="w-7 h-7 flex items-center justify-center rounded-full text-[--color-text-muted] hover:bg-[--color-border] transition-colors"
            aria-label="Dismiss"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
