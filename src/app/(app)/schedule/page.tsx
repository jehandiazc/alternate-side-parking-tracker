"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MapPin, CalendarDays, Sparkles, Loader2, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { fetchCleaningSchedule, type CleaningWindow } from "@/lib/nyc-open-data";
import { Button } from "@/components/ui/Button";
import type { Car, ParkingLog } from "@/types";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_FULL   = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function formatTime(hour: number, min: number): string {
  const period = hour < 12 ? "AM" : "PM";
  const h = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return min === 0 ? `${h} ${period}` : `${h}:${String(min).padStart(2, "0")} ${period}`;
}

function formatWindow(w: CleaningWindow): string {
  const startPeriod = w.startHour < 12 ? "AM" : "PM";
  const endPeriod   = w.endHour   < 12 ? "AM" : "PM";
  const startH = w.startHour === 0 ? 12 : w.startHour > 12 ? w.startHour - 12 : w.startHour;
  const endH   = w.endHour   === 0 ? 12 : w.endHour   > 12 ? w.endHour   - 12 : w.endHour;
  const startStr = w.startMin === 0 ? `${startH}` : `${startH}:${String(w.startMin).padStart(2, "0")}`;
  const endStr   = w.endMin   === 0 ? `${endH}`   : `${endH}:${String(w.endMin).padStart(2, "0")}`;
  return startPeriod === endPeriod
    ? `${startStr}–${endStr} ${endPeriod}`
    : `${startStr} ${startPeriod}–${endStr} ${endPeriod}`;
}

/** Build a full-sentence next-cleaning string, e.g. "Monday 8–9 AM" */
function describeNextCleaning(windows: CleaningWindow[]): { day: string; time: string } | null {
  if (windows.length === 0) return null;
  const now = new Date();
  let earliest: { candidate: Date; window: CleaningWindow } | null = null;

  for (const w of windows) {
    const candidate = new Date(now);
    const daysAhead = (w.day - candidate.getDay() + 7) % 7;
    candidate.setDate(candidate.getDate() + daysAhead);
    candidate.setHours(w.startHour, w.startMin, 0, 0);
    if (candidate <= now) candidate.setDate(candidate.getDate() + 7);
    if (!earliest || candidate < earliest.candidate) earliest = { candidate, window: w };
  }

  if (!earliest) return null;
  const daysUntil = Math.round(
    (earliest.candidate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );
  const dayLabel =
    daysUntil === 0 ? "Today" :
    daysUntil === 1 ? "Tomorrow" :
    DAY_FULL[earliest.window.day];

  return { day: dayLabel, time: formatTime(earliest.window.startHour, earliest.window.startMin) };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type PageState =
  | { status: "loading" }
  | { status: "no-car" }
  | { status: "no-log"; car: Car }
  | { status: "fetching"; car: Car; log: ParkingLog }
  | { status: "ready"; car: Car; log: ParkingLog; windows: CleaningWindow[] }
  | { status: "error"; message: string };

export default function SchedulePage() {
  const router = useRouter();
  const [state, setState] = useState<PageState>({ status: "loading" });

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const { data: sub } = await supabase
        .from("car_subscriptions")
        .select("car_id, cars(*)")
        .eq("user_id", user.id)
        .limit(1)
        .single();

      if (!sub) { setState({ status: "no-car" }); return; }

      const car = (sub as unknown as { car_id: string; cars: Car }).cars;

      const { data: log } = await supabase
        .from("parking_logs")
        .select("*")
        .eq("car_id", car.id)
        .eq("is_active", true)
        .single();

      if (!log) { setState({ status: "no-log", car }); return; }

      setState({ status: "fetching", car, log });

      try {
        const windows = await fetchCleaningSchedule(
          log.street_address,
          log.street_side,
          { lat: log.latitude, lng: log.longitude }
        );
        setState({ status: "ready", car, log, windows });
      } catch (err) {
        setState({ status: "error", message: String(err) });
      }
    }

    load();
  }, [router]);

  // ── Loading ──
  if (state.status === "loading" || state.status === "fetching") {
    return (
      <div className="flex items-center justify-center h-[100dvh] bg-[--color-background]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={28} className="animate-spin text-[--color-primary]" />
          {state.status === "fetching" && (
            <p className="text-sm text-[--color-text-secondary]">Looking up schedule…</p>
          )}
        </div>
      </div>
    );
  }

  // ── No car ──
  if (state.status === "no-car") {
    return (
      <div className="flex flex-col items-center justify-center h-[100dvh] gap-4 px-6 bg-[--color-background] text-center">
        <div className="text-5xl">🚗</div>
        <h1 className="text-xl font-extrabold text-[--color-text-primary]">No car yet</h1>
        <p className="text-sm text-[--color-text-secondary] max-w-xs">
          Set up a car to see its street cleaning schedule.
        </p>
        <Button variant="cta" size="lg" asChild>
          <Link href="/setup"><MapPin size={18} /> Set up a car</Link>
        </Button>
      </div>
    );
  }

  // ── No active log ──
  if (state.status === "no-log") {
    return (
      <div className="flex flex-col items-center justify-center h-[100dvh] gap-4 px-6 bg-[--color-background] text-center">
        <div className="text-5xl">📍</div>
        <h1 className="text-xl font-extrabold text-[--color-text-primary]">Car not parked yet</h1>
        <p className="text-sm text-[--color-text-secondary] max-w-xs">
          Log where {state.car.name} is parked and we&apos;ll pull up the cleaning schedule for that street.
        </p>
        <Button variant="cta" size="lg" asChild>
          <Link href="/park"><MapPin size={18} /> Log parking location</Link>
        </Button>
      </div>
    );
  }

  // ── Error ──
  if (state.status === "error") {
    return (
      <div className="flex flex-col items-center justify-center h-[100dvh] gap-4 px-6 bg-[--color-background] text-center">
        <AlertCircle size={40} className="text-[--color-danger]" />
        <p className="text-sm text-[--color-text-secondary]">{state.message}</p>
      </div>
    );
  }

  // ── Ready ──
  const { car, log, windows } = state;
  const today = new Date().getDay();
  const next  = describeNextCleaning(windows);

  // Group windows by day for the week grid
  const byDay = new Map<number, CleaningWindow[]>();
  for (const w of windows) {
    if (!byDay.has(w.day)) byDay.set(w.day, []);
    byDay.get(w.day)!.push(w);
  }

  const cleaningDays = Array.from(byDay.entries()).sort((a, b) => a[0] - b[0]);

  return (
    <div
      className="min-h-full bg-[--color-background] pb-8"
      style={{ paddingTop: "max(env(safe-area-inset-top), 16px)" }}
    >
      <div className="px-4 max-w-lg mx-auto space-y-5 pt-4">

        {/* ── Header ── */}
        <div>
          <p className="text-[11px] font-bold text-[--color-text-muted] uppercase tracking-widest mb-0.5">
            Street Cleaning
          </p>
          <h1 className="text-2xl font-extrabold text-[--color-text-primary] leading-tight">
            Schedule
          </h1>
        </div>

        {/* ── Location context ── */}
        <div
          className="flex items-center gap-3 rounded-[var(--radius-lg)] px-4 py-3"
          style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
        >
          <span className="flex-shrink-0 w-8 h-8 rounded-full bg-[--color-primary-light] flex items-center justify-center">
            <MapPin size={14} className="text-[--color-primary]" />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold text-[--color-text-muted] uppercase tracking-wide leading-none mb-0.5">
              {car.name} · parked on
            </p>
            <p className="text-sm font-bold text-[--color-text-primary] truncate">
              {log.display_address || log.street_address}
              <span className="ml-1.5 text-xs font-normal text-[--color-text-secondary]">
                ({log.street_side} side)
              </span>
            </p>
          </div>
        </div>

        {windows.length === 0 ? (
          /* ── No schedule found ── */
          <div
            className="rounded-[var(--radius-lg)] p-5 text-center space-y-2"
            style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
          >
            <p className="text-2xl">🤷</p>
            <p className="font-semibold text-[--color-text-primary] text-sm">
              No schedule found for this block
            </p>
            <p className="text-xs text-[--color-text-secondary] max-w-xs mx-auto">
              This street may not have alternate side parking regulations, or the address
              didn&apos;t match NYC&apos;s dataset exactly.
            </p>
          </div>
        ) : (
          <>
            {/* ── Next cleaning ── */}
            {next && (
              <div
                className="rounded-[var(--radius-lg)] px-4 py-4 flex items-center gap-3"
                style={{ background: "var(--color-accent-light)", border: "1px solid var(--color-accent)" }}
              >
                <span className="flex-shrink-0 w-9 h-9 rounded-full bg-white/60 flex items-center justify-center">
                  <CalendarDays size={16} className="text-[--color-accent-hover]" />
                </span>
                <div>
                  <p className="text-[10px] font-semibold text-[--color-accent-hover] uppercase tracking-wide leading-none mb-0.5">
                    Next cleaning
                  </p>
                  <p className="text-base font-extrabold text-[--color-text-primary] leading-tight">
                    {next.day} · move by {next.time}
                  </p>
                </div>
              </div>
            )}

            {/* ── Week grid ── */}
            <div
              className="rounded-[var(--radius-lg)] overflow-hidden"
              style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
            >
              <div className="px-4 pt-4 pb-2">
                <p className="text-xs font-bold text-[--color-text-muted] uppercase tracking-wide">
                  Weekly schedule
                </p>
              </div>

              {/* Day pills row */}
              <div className="px-4 pb-4 flex gap-1.5">
                {DAY_LABELS.map((label, idx) => {
                  const hasWindow = byDay.has(idx);
                  const isToday   = idx === today;
                  return (
                    <div
                      key={idx}
                      className="flex-1 flex flex-col items-center gap-1 py-2 rounded-[var(--radius-md)]"
                      style={{
                        background: hasWindow
                          ? "var(--color-accent-light)"
                          : isToday
                          ? "var(--color-primary-light)"
                          : "var(--color-background)",
                        outline: isToday ? "1.5px solid var(--color-primary)" : undefined,
                      }}
                    >
                      <span
                        className="text-[10px] font-bold uppercase tracking-wide"
                        style={{
                          color: hasWindow
                            ? "var(--color-accent-hover)"
                            : isToday
                            ? "var(--color-primary)"
                            : "var(--color-text-muted)",
                        }}
                      >
                        {label}
                      </span>
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{
                          background: hasWindow
                            ? "var(--color-accent)"
                            : "transparent",
                        }}
                      />
                    </div>
                  );
                })}
              </div>

              {/* Cleaning day detail rows */}
              {cleaningDays.map(([day, dayWindows], i) => (
                <div
                  key={day}
                  className="px-4 py-3 flex items-center justify-between gap-3"
                  style={{
                    borderTop: "1px solid var(--color-border)",
                    background: day === today ? "var(--color-primary-light)" : undefined,
                  }}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                      style={{
                        background: "var(--color-accent-light)",
                        color: "var(--color-accent-hover)",
                      }}
                    >
                      {DAY_LABELS[day]}
                    </span>
                    <span className="text-sm font-semibold text-[--color-text-primary]">
                      {DAY_FULL[day]}
                      {day === today && (
                        <span className="ml-2 text-[10px] font-bold text-[--color-primary] uppercase tracking-wide">
                          Today
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="text-right">
                    {dayWindows.map((w, wi) => (
                      <p key={wi} className="text-sm font-semibold text-[--color-text-secondary]">
                        {formatWindow(w)}
                      </p>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* ── Holiday note ── */}
            <div
              className="flex items-start gap-3 rounded-[var(--radius-lg)] px-4 py-3"
              style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
            >
              <Sparkles size={15} className="text-[--color-success] flex-shrink-0 mt-0.5" />
              <p className="text-xs text-[--color-text-secondary] leading-relaxed">
                <strong className="text-[--color-text-primary]">Holidays:</strong>{" "}
                NYC 311 suspension detection is coming soon — on suspended days the app
                will automatically show &ldquo;no need to move&rdquo; and skip your notification.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
