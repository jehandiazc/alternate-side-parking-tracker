"use client";

import dynamic from "next/dynamic";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  reverseGeocode,
  autoDetectSide,
  fetchCleaningSchedule,
  nextMoveAt,
  type GeocodeResult,
} from "@/lib/nyc-open-data";
import { StreetSidePicker } from "@/components/app/StreetSidePicker";
import { Button } from "@/components/ui/Button";
import { MapPin, Loader2, Navigation, CheckCircle2, LocateOff } from "lucide-react";
import type { StreetSide } from "@/types";

const ParkingMap = dynamic(() => import("@/components/app/ParkingMap"), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-[#e8e0d0] animate-pulse" />,
});

const DEFAULT_LAT = 40.7831;
const DEFAULT_LNG = -73.9712;

export default function ParkPage() {
  const router = useRouter();

  const [lat, setLat] = useState(DEFAULT_LAT);
  const [lng, setLng] = useState(DEFAULT_LNG);
  const [flySeq, setFlySeq] = useState(0);

  // Full geocode result — gives us streetName for the DB and displayAddress for the UI
  const [geocodeResult, setGeocodeResult] = useState<GeocodeResult | null>(null);
  const [streetSide, setStreetSide] = useState<StreetSide | null>(null);

  const [gpsStatus, setGpsStatus]         = useState<"acquiring" | "ready" | "denied">("acquiring");
  const [geocodeStatus, setGeocodeStatus] = useState<"idle" | "loading" | "done">("idle");
  const [autoDetecting, setAutoDetecting] = useState(false);
  const [submitStatus, setSubmitStatus]   = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg]           = useState("");

  const geocodeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Full geocode: get address + road centerline → auto-detect side
  const geocodeAndDetect = useCallback(async (latVal: number, lngVal: number) => {
    setGeocodeStatus("loading");
    setAutoDetecting(true);
    const result = await reverseGeocode(latVal, lngVal);
    setGeocodeResult(result);
    setGeocodeStatus("done");

    if (result.streetName) {
      const detectedSide = autoDetectSide(latVal, lngVal, result);
      setStreetSide(detectedSide);
    }
    setAutoDetecting(false);
  }, []);

  // Quick geocode (on map drag): just update the address display, don't re-detect side
  const geocodeQuick = useCallback(async (latVal: number, lngVal: number) => {
    setGeocodeStatus("loading");
    const result = await reverseGeocode(latVal, lngVal);
    setGeocodeResult(result);
    setGeocodeStatus("done");
    // Also re-detect side when the user drags to a new location
    if (result.streetName) {
      setAutoDetecting(true);
      const detectedSide = autoDetectSide(latVal, lngVal, result);
      setStreetSide(detectedSide);
      setAutoDetecting(false);
    }
  }, []);

  const scheduleGeocode = useCallback((latVal: number, lngVal: number) => {
    if (geocodeTimer.current) clearTimeout(geocodeTimer.current);
    geocodeTimer.current = setTimeout(() => geocodeQuick(latVal, lngVal), 600);
  }, [geocodeQuick]);

  // GPS acquisition on mount
  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsStatus("denied");
      geocodeAndDetect(DEFAULT_LAT, DEFAULT_LNG);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setLat(latitude);
        setLng(longitude);
        setFlySeq((s) => s + 1);
        setGpsStatus("ready");
        geocodeAndDetect(latitude, longitude);
      },
      () => {
        setGpsStatus("denied");
        geocodeAndDetect(DEFAULT_LAT, DEFAULT_LNG);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [geocodeAndDetect]);

  function retryGps() {
    if (!navigator.geolocation) return;
    setGpsStatus("acquiring");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setLat(latitude);
        setLng(longitude);
        setFlySeq((s) => s + 1);
        setGpsStatus("ready");
        geocodeAndDetect(latitude, longitude);
      },
      () => setGpsStatus("denied"),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function handleConfirm() {
    const streetName = geocodeResult?.streetName;
    if (!streetName || !streetSide) return;
    setSubmitStatus("loading");
    setErrorMsg("");

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    const { data: subs } = await supabase
      .from("car_subscriptions")
      .select("car_id")
      .eq("user_id", user.id)
      .limit(1)
      .single();

    if (!subs?.car_id) { router.push("/setup"); return; }

    const windows  = await fetchCleaningSchedule(streetName, streetSide, { lat, lng });
    const moveDate = nextMoveAt(windows);

    const { error } = await supabase.from("parking_logs").insert({
      car_id:          subs.car_id,
      logged_by:       user.id,
      latitude:        lat,
      longitude:       lng,
      // Road name only — used for DOT API queries (must not include house number)
      street_address:  streetName,
      // Full address — shown to users so they can find the exact car location
      display_address: geocodeResult.displayAddress || streetName,
      // House number stored separately for block-level schedule filtering
      house_number:    geocodeResult.houseNumber || null,
      street_side:     streetSide,
      next_move_at:    moveDate?.toISOString() ?? null,
    });

    if (error) {
      setSubmitStatus("error");
      setErrorMsg(error.message);
      return;
    }

    setSubmitStatus("success");
    setTimeout(() => router.push("/"), 1200);
  }

  if (submitStatus === "success") {
    return (
      <div className="flex flex-col items-center justify-center h-[100dvh] gap-4 px-6 bg-[--color-background]">
        <CheckCircle2 size={56} className="text-[--color-success]" />
        <p className="text-lg font-bold text-[--color-text-primary]">Parking logged!</p>
        <p className="text-sm text-[--color-text-secondary]">Taking you back to the dashboard…</p>
      </div>
    );
  }

  const displayAddress = geocodeResult?.displayAddress ?? "";

  return (
    <div className="relative w-full h-[100dvh]">

      <ParkingMap
        lat={lat}
        lng={lng}
        flySeq={flySeq}
        className="absolute inset-0 w-full h-full z-0"
        onCenterChange={(newLat, newLng) => {
          setLat(newLat);
          setLng(newLng);
          scheduleGeocode(newLat, newLng);
        }}
        showCrosshair
      />

      {/* ── Top scrim + back button ── */}
      <div
        className="absolute top-0 inset-x-0 z-10 pointer-events-none px-4 pb-10"
        style={{
          paddingTop: "max(env(safe-area-inset-top), 16px)",
          background: "linear-gradient(to bottom, rgba(26,26,46,0.5) 0%, transparent 100%)",
        }}
      >
        <div className="flex items-center gap-3 max-w-lg mx-auto pt-2 pointer-events-auto">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white hover:bg-white/25 transition-colors"
            aria-label="Go back"
          >
            ←
          </button>
          <h1 className="text-base font-extrabold text-white">Log Parking</h1>
        </div>
      </div>

      {/* ── GPS status banners ── */}
      {gpsStatus === "acquiring" && (
        <div className="absolute top-20 inset-x-0 z-10 flex justify-center pointer-events-none">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[--color-primary] text-white text-xs font-semibold shadow-md">
            <Loader2 size={12} className="animate-spin" />
            Finding your location…
          </div>
        </div>
      )}

      {gpsStatus === "denied" && (
        <div className="absolute top-20 inset-x-0 z-10 flex justify-center px-4 pointer-events-none">
          <div
            className="flex items-center gap-3 px-4 py-2.5 rounded-[var(--radius-lg)] text-xs font-semibold shadow-md pointer-events-auto max-w-sm w-full"
            style={{ background: "rgba(250,248,244,0.96)", border: "1px solid var(--color-border)" }}
          >
            <LocateOff size={14} className="text-[--color-danger] flex-shrink-0" />
            <span className="text-[--color-text-secondary] flex-1">
              Location access is off — move the map to your street manually.
            </span>
            <button
              onClick={retryGps}
              className="text-[--color-primary] font-bold whitespace-nowrap hover:underline"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {/* ── Bottom panel ── */}
      <div
        className="absolute bottom-0 inset-x-0 z-10 pointer-events-none"
        style={{ paddingBottom: "calc(4.5rem + env(safe-area-inset-bottom))" }}
      >
        <div
          className="mx-4 rounded-[var(--radius-xl)] overflow-hidden pointer-events-auto"
          style={{
            background: "rgba(250,248,244,0.96)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            boxShadow: "0 8px 32px rgba(26,26,46,0.18), 0 0 0 1px rgba(26,26,46,0.06)",
            maxWidth: "480px",
            margin: "0 auto",
          }}
        >
          <div className="p-4 space-y-4">

            {/* Address row */}
            <div className="flex items-center gap-2.5">
              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-[--color-primary-light] flex items-center justify-center">
                {geocodeStatus === "loading"
                  ? <Loader2 size={14} className="text-[--color-primary] animate-spin" />
                  : <MapPin size={14} className="text-[--color-primary]" />
                }
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold text-[--color-text-muted] uppercase tracking-wide leading-none mb-0.5">
                  Parking at
                </p>
                <p className="text-sm font-bold text-[--color-text-primary] truncate">
                  {geocodeStatus === "loading"
                    ? "Resolving address…"
                    : displayAddress || "Move the map to set location"
                  }
                </p>
              </div>
              <button
                type="button"
                onClick={retryGps}
                className="flex-shrink-0 w-8 h-8 rounded-full bg-white border border-[--color-border] flex items-center justify-center text-[--color-text-secondary] hover:text-[--color-primary] transition-colors"
                aria-label="Re-centre on my location"
              >
                <Navigation size={13} />
              </button>
            </div>

            <div className="border-t border-[--color-border]" />

            {/* Street side picker */}
            <StreetSidePicker
              value={streetSide}
              onChange={setStreetSide}
              autoDetecting={autoDetecting}
            />

            {errorMsg && (
              <p className="text-xs text-[--color-danger] bg-[--color-danger-light] rounded-[var(--radius-sm)] px-3 py-2">
                {errorMsg}
              </p>
            )}

            <Button
              variant="cta"
              size="lg"
              className="w-full"
              onClick={handleConfirm}
              disabled={
                submitStatus === "loading" ||
                !geocodeResult?.streetName ||
                !streetSide ||
                geocodeStatus === "loading" ||
                autoDetecting
              }
            >
              {submitStatus === "loading"
                ? <><Loader2 size={18} className="animate-spin" /> Saving…</>
                : <><MapPin size={18} /> Confirm Parking</>
              }
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
