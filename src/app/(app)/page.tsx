"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { MapPin, Bell, Clock, Sparkles, AlertCircle, Navigation } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatMoveTime, formatCountdown } from "@/lib/utils";
import type { ParkingStatus } from "@/types";

// Leaflet must be loaded client-side only — no SSR
const ParkingMap = dynamic(() => import("@/components/app/ParkingMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-[#e8e0d0] animate-pulse" />
  ),
});

// ─── Mock data — replace with Supabase query in Phase 1 ───────────────────
const CAR_NAME = "The Civic";
const LAT = 40.7831;
const LNG = -73.9712;
const STATUS: ParkingStatus = {
  type: "parked",
  log: {
    id: "1",
    car_id: "1",
    logged_by: "1",
    latitude: LAT,
    longitude: LNG,
    street_address: "W 84th St",
    street_side: "N",
    next_move_at: new Date(Date.now() + 1000 * 60 * 60 * 14).toISOString(),
    is_active: true,
    created_at: new Date().toISOString(),
  },
  moveAt: new Date(Date.now() + 1000 * 60 * 60 * 14),
  isSuspended: false,
};
// ──────────────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const isParked = STATUS.type === "parked";
  const moveAt = isParked ? STATUS.moveAt : null;
  const isSuspended = isParked ? STATUS.isSuspended : false;
  const log = isParked ? STATUS.log : null;

  const hoursUntilMove = moveAt
    ? (moveAt.getTime() - Date.now()) / (1000 * 60 * 60)
    : Infinity;
  const isUrgent = hoursUntilMove > 0 && hoursUntilMove <= 2;

  return (
    // Full-screen container — map fills the background
    <div className="relative w-full h-[100dvh]">

      {/* ── Map layer ── */}
      {isParked && log ? (
        <ParkingMap
          lat={log.latitude}
          lng={log.longitude}
          className="absolute inset-0 w-full h-full z-0"
        />
      ) : (
        // No location logged yet — warm textured placeholder
        <div className="absolute inset-0 bg-[#e8e0d0] z-0" />
      )}

      {/* ── Top gradient scrim + header ── */}
      <div
        className="absolute top-0 inset-x-0 z-10 px-4 pt-[env(safe-area-inset-top)]"
        style={{
          background:
            "linear-gradient(to bottom, rgba(26,26,46,0.55) 0%, rgba(26,26,46,0) 100%)",
          paddingTop: "max(env(safe-area-inset-top), 16px)",
          paddingBottom: "48px",
        }}
      >
        <div className="flex items-center justify-between max-w-lg mx-auto pt-2">
          <div>
            <p className="text-[11px] font-bold text-white/60 uppercase tracking-widest">
              Parking Tracker
            </p>
            <h1 className="text-xl font-extrabold text-white leading-tight">
              ParkShare
            </h1>
          </div>
          <button
            aria-label="Notification settings"
            className="w-9 h-9 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white hover:bg-white/25 transition-colors"
          >
            <Bell size={16} />
          </button>
        </div>
      </div>

      {/* ── Bottom overlay panel ── */}
      <div
        className="absolute bottom-0 inset-x-0 z-10"
        style={{ paddingBottom: "calc(4rem + env(safe-area-inset-bottom))" }}
      >
        {/* Gradient fade from transparent into the panel */}
        <div
          className="h-16 pointer-events-none"
          style={{
            background:
              "linear-gradient(to bottom, rgba(250,248,244,0) 0%, rgba(250,248,244,0.92) 100%)",
          }}
        />

        <div
          className="px-4 pb-4 pt-3 max-w-lg mx-auto space-y-3"
          style={{ background: "rgba(250,248,244,0.96)", backdropFilter: "blur(12px)" }}
        >
          {isParked && log && moveAt ? (
            <>
              {/* Street + side */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-[--color-primary-light] flex items-center justify-center">
                    <MapPin size={15} className="text-[--color-primary]" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold text-[--color-text-muted] uppercase tracking-wide">
                      {CAR_NAME} is parked on
                    </p>
                    <p className="text-base font-bold text-[--color-text-primary] leading-tight truncate">
                      {log.street_address}
                      <span className="ml-1.5 text-sm font-normal text-[--color-text-secondary]">
                        ({log.street_side} side)
                      </span>
                    </p>
                  </div>
                </div>

                {/* Navigate button */}
                <a
                  href={`https://maps.apple.com/?daddr=${log.latitude},${log.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-shrink-0 w-8 h-8 rounded-full bg-[--color-surface-raised] border border-[--color-border] flex items-center justify-center text-[--color-text-secondary] hover:text-[--color-primary] transition-colors"
                  aria-label="Navigate to car"
                >
                  <Navigation size={14} />
                </a>
              </div>

              {/* Divider */}
              <div className="border-t border-[--color-border]" />

              {/* Move deadline */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span
                    className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                      isSuspended
                        ? "bg-[--color-success-light]"
                        : isUrgent
                        ? "bg-[--color-danger-light]"
                        : "bg-[--color-accent-light]"
                    }`}
                  >
                    {isSuspended ? (
                      <Sparkles size={15} className="text-[#4a7a3a]" />
                    ) : isUrgent ? (
                      <AlertCircle size={15} className="text-[--color-danger]" />
                    ) : (
                      <Clock size={15} className="text-[--color-accent-hover]" />
                    )}
                  </span>
                  <div>
                    <p className="text-[11px] font-semibold text-[--color-text-muted] uppercase tracking-wide">
                      {isSuspended ? "Suspended" : "Move by"}
                    </p>
                    <p className="text-base font-bold text-[--color-text-primary] leading-tight">
                      {isSuspended
                        ? "No need to move 🎉"
                        : formatMoveTime(moveAt)}
                    </p>
                  </div>
                </div>

                {isSuspended ? (
                  <Badge variant="success">
                    <Sparkles size={10} />
                    Holiday!
                  </Badge>
                ) : isUrgent ? (
                  <Badge variant="danger">
                    <AlertCircle size={10} />
                    Move Soon
                  </Badge>
                ) : (
                  <span className="text-sm font-medium text-[--color-text-secondary]">
                    {formatCountdown(moveAt)}
                  </span>
                )}
              </div>

              {/* CTA */}
              <Button variant="cta" size="lg" className="w-full mt-1" asChild>
                <Link href="/park">
                  <MapPin size={18} />
                  I Just Parked
                </Link>
              </Button>
            </>
          ) : (
            /* Unknown state — car not logged */
            <div className="text-center py-4 space-y-3">
              <p className="text-4xl">🚗</p>
              <div>
                <p className="font-bold text-[--color-text-primary]">
                  Where's {CAR_NAME}?
                </p>
                <p className="text-sm text-[--color-text-secondary] mt-0.5">
                  Log the parking spot and we'll handle the rest.
                </p>
              </div>
              <Button variant="cta" size="lg" className="w-full" asChild>
                <Link href="/park">
                  <MapPin size={18} />
                  Log Parking Location
                </Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
