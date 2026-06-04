"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Bell, BellOff, BellRing, Clock, Sparkles, AlertCircle, Navigation, Loader2, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatMoveTime, formatCountdown } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { PushNotificationManager, type PushNotifState } from "@/components/app/PushNotificationManager";
import type { Car, ParkingLog } from "@/types";

const ParkingMap = dynamic(() => import("@/components/app/ParkingMap"), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-[#e8e0d0] animate-pulse" />,
});

interface DashboardState {
  status: "loading" | "no-car" | "no-log" | "parked";
  car: Car | null;
  log: ParkingLog | null;
}

export default function DashboardPage() {
  const router = useRouter();
  const [state, setState] = useState<DashboardState>({
    status: "loading",
    car: null,
    log: null,
  });

  // Push notification state
  const [notifState, setNotifState] = useState<PushNotifState>({
    permission: "default",
    subscribed: false,
    loading: false,
  });
  const requestAndSubscribeRef = useRef<(() => Promise<void>) | null>(null);
  const handleNotifReady = useCallback((fn: () => Promise<void>) => {
    requestAndSubscribeRef.current = fn;
  }, []);

  const handleBellClick = useCallback(() => {
    if (notifState.permission === "denied") return; // can't prompt again — browser blocks
    requestAndSubscribeRef.current?.();
  }, [notifState.permission]);

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      // Get the user's first subscribed car
      const { data: sub } = await supabase
        .from("car_subscriptions")
        .select("car_id, cars(*)")
        .eq("user_id", user.id)
        .limit(1)
        .single();

      if (!sub) {
        setState({ status: "no-car", car: null, log: null });
        return;
      }

      const car = (sub as unknown as { car_id: string; cars: Car }).cars;

      // Get the active parking log for that car
      const { data: log } = await supabase
        .from("parking_logs")
        .select("*")
        .eq("car_id", car.id)
        .eq("is_active", true)
        .single();

      setState({
        status: log ? "parked" : "no-log",
        car,
        log: log ?? null,
      });
    }

    load();

    // Subscribe to real-time updates on parking_logs
    const channel = supabase
      .channel("parking_logs_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "parking_logs" },
        () => load()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [router]);

  // Derived values
  const { car, log } = state;
  const moveAt = log?.next_move_at ? new Date(log.next_move_at) : null;
  const hoursUntilMove = moveAt
    ? (moveAt.getTime() - Date.now()) / (1000 * 60 * 60)
    : Infinity;
  const isUrgent = hoursUntilMove > 0 && hoursUntilMove <= 2;
  // Suspension check comes in Phase 3 (311 feed); placeholder for now
  const isSuspended = false;

  // ── Loading ──
  if (state.status === "loading") {
    return (
      <div className="flex items-center justify-center h-[100dvh] bg-[--color-background]">
        <Loader2 size={28} className="animate-spin text-[--color-primary]" />
      </div>
    );
  }

  // ── No car yet ──
  if (state.status === "no-car") {
    return (
      <div className="flex flex-col items-center justify-center h-[100dvh] gap-4 px-6 bg-[--color-background] text-center">
        <div className="text-5xl">🚗</div>
        <h1 className="text-xl font-extrabold text-[--color-text-primary]">No car yet</h1>
        <p className="text-sm text-[--color-text-secondary] max-w-xs">
          Set up your first car to get started.
        </p>
        <Button variant="cta" size="lg" asChild>
          <Link href="/setup"><MapPin size={18} /> Set up a car</Link>
        </Button>
      </div>
    );
  }

  const carName = car?.name ?? "Your car";

  // Bell icon + aria-label based on notification permission state
  const BellIcon =
    notifState.permission === "granted"
      ? BellRing
      : notifState.permission === "denied"
      ? BellOff
      : Bell;
  const bellLabel =
    notifState.permission === "granted"
      ? "Notifications enabled"
      : notifState.permission === "denied"
      ? "Notifications blocked — enable in browser settings"
      : "Enable move reminders";
  const bellActive = notifState.permission === "granted";

  return (
    <div className="relative w-full h-[100dvh]">

      {/* Push notification manager — registers SW + handles permission */}
      <PushNotificationManager
        onStateChange={setNotifState}
        onReady={handleNotifReady}
      />

      {/* ── Map ── */}
      {log ? (
        <ParkingMap
          lat={log.latitude}
          lng={log.longitude}
          className="absolute inset-0 w-full h-full z-0"
          carDetails={car ? { name: carName, make: car.make, model: car.model, color: car.color } : undefined}
        />
      ) : (
        <div className="absolute inset-0 bg-[#e8e0d0] z-0" />
      )}

      {/* ── Overlay ── */}
      <div className="absolute inset-0 z-10 pointer-events-none">

        {/* Header */}
        <div
          className="absolute top-0 inset-x-0 px-4 pb-12"
          style={{
            paddingTop: "max(env(safe-area-inset-top), 16px)",
            background: "linear-gradient(to bottom, rgba(26,26,46,0.5) 0%, transparent 100%)",
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
            <div className="flex flex-col items-end gap-1 pointer-events-auto">
              <button
                aria-label={bellLabel}
                title={bellLabel}
                onClick={handleBellClick}
                disabled={notifState.loading || notifState.permission === "denied"}
                className={[
                  "w-9 h-9 rounded-full backdrop-blur-sm border flex items-center justify-center transition-colors",
                  bellActive
                    ? "bg-[--color-accent] border-[--color-accent] text-white"
                    : notifState.permission === "denied"
                    ? "bg-white/10 border-white/20 text-white/40 cursor-not-allowed"
                    : "bg-white/15 border-white/20 text-white hover:bg-white/25",
                ].join(" ")}
              >
                {notifState.loading
                  ? <Loader2 size={16} className="animate-spin" />
                  : <BellIcon size={16} />
                }
              </button>
              {notifState.error && (
                <p className="text-[10px] text-red-300 bg-black/40 rounded px-2 py-0.5 max-w-[180px] text-right leading-snug">
                  {notifState.error}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Floating card */}
        <div
          className="absolute inset-x-4 pointer-events-auto"
          style={{
            bottom: "calc(4.5rem + env(safe-area-inset-bottom))",
            maxWidth: "480px",
            margin: "0 auto",
            left: "max(1rem, 50% - 240px)",
            right: "max(1rem, 50% - 240px)",
          }}
        >
          <div
            className="rounded-[var(--radius-xl)] overflow-hidden"
            style={{
              background: "rgba(250,248,244,0.94)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              boxShadow: "0 8px 32px rgba(26,26,46,0.18), 0 2px 8px rgba(26,26,46,0.10), 0 0 0 1px rgba(26,26,46,0.06)",
            }}
          >
            {log ? (
              <div className="p-4 space-y-3">
                {/* Street + navigate */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-[--color-primary-light] flex items-center justify-center">
                      <MapPin size={14} className="text-[--color-primary]" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold text-[--color-text-muted] uppercase tracking-wide leading-none mb-0.5">
                        {carName} · parked on
                      </p>
                      <p className="text-sm font-bold text-[--color-text-primary] leading-tight truncate">
                        {log.display_address || log.street_address}
                        <span className="ml-1.5 text-xs font-normal text-[--color-text-secondary]">
                          ({log.street_side} side)
                        </span>
                      </p>
                    </div>
                  </div>
                  <a
                    href={`https://maps.apple.com/?daddr=${log.latitude},${log.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Navigate to car"
                    className="flex-shrink-0 w-8 h-8 rounded-full bg-white border border-[--color-border] flex items-center justify-center text-[--color-text-secondary] hover:text-[--color-primary] transition-colors shadow-sm"
                  >
                    <Navigation size={13} />
                  </a>
                </div>

                <div className="border-t border-[--color-border]" />

                {/* Move deadline */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                      isSuspended ? "bg-[--color-success-light]"
                      : isUrgent  ? "bg-[--color-danger-light]"
                      : moveAt    ? "bg-[--color-accent-light]"
                      : "bg-[--color-surface-raised]"
                    }`}>
                      {isSuspended ? <Sparkles size={14} className="text-[#4a7a3a]" />
                      : isUrgent   ? <AlertCircle size={14} className="text-[--color-danger]" />
                      : moveAt     ? <Clock size={14} className="text-[--color-accent-hover]" />
                      : <HelpCircle size={14} className="text-[--color-text-muted]" />}
                    </span>
                    <div>
                      <p className="text-[10px] font-semibold text-[--color-text-muted] uppercase tracking-wide leading-none mb-0.5">
                        {isSuspended ? "Suspended" : moveAt ? "Move by" : "Move time"}
                      </p>
                      <p className="text-sm font-bold text-[--color-text-primary] leading-tight">
                        {isSuspended ? "No need to move 🎉"
                        : moveAt ? formatMoveTime(moveAt)
                        : "No schedule found — check the signs"}
                      </p>
                    </div>
                  </div>
                  {isSuspended ? (
                    <Badge variant="success"><Sparkles size={10} />Holiday!</Badge>
                  ) : isUrgent ? (
                    <Badge variant="danger"><AlertCircle size={10} />Move Soon</Badge>
                  ) : moveAt ? (
                    <span className="text-xs font-medium text-[--color-text-secondary] whitespace-nowrap">
                      {formatCountdown(moveAt)}
                    </span>
                  ) : (
                    <Badge variant="muted">Unknown</Badge>
                  )}
                </div>

                <Button variant="cta" size="lg" className="w-full" asChild>
                  <Link href="/park"><MapPin size={18} />I Just Parked</Link>
                </Button>
              </div>
            ) : (
              /* No active log */
              <div className="p-5 text-center space-y-3">
                <p className="text-4xl">🚗</p>
                <div>
                  <p className="font-bold text-[--color-text-primary]">
                    Where&apos;s {carName}?
                  </p>
                  <p className="text-sm text-[--color-text-secondary] mt-0.5">
                    Log the parking spot and we&apos;ll handle the rest.
                  </p>
                </div>
                <Button variant="cta" size="lg" className="w-full" asChild>
                  <Link href="/park"><MapPin size={18} />Log Parking Location</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
