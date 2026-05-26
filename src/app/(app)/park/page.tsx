"use client";

import dynamic from "next/dynamic";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { reverseGeocode, fetchCleaningSchedule, nextMoveAt } from "@/lib/nyc-open-data";
import { StreetSidePicker } from "@/components/app/StreetSidePicker";
import { Button } from "@/components/ui/Button";
import { MapPin, Loader2, Navigation, CheckCircle2 } from "lucide-react";
import type { StreetSide } from "@/types";

// Map with a fixed crosshair — user moves the map, not the pin
const ParkingMap = dynamic(() => import("@/components/app/ParkingMap"), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-[#e8e0d0] animate-pulse" />,
});

// NYC default — Central Park West area
const DEFAULT_LAT = 40.7831;
const DEFAULT_LNG = -73.9712;

export default function ParkPage() {
  const router = useRouter();

  // Map center (follows GPS or user drag)
  const [lat, setLat] = useState(DEFAULT_LAT);
  const [lng, setLng] = useState(DEFAULT_LNG);

  const [streetAddress, setStreetAddress] = useState("");
  const [streetSide, setStreetSide]       = useState<StreetSide | null>(null);

  const [gpsStatus, setGpsStatus] = useState<"acquiring" | "ready" | "denied">("acquiring");
  const [geocodeStatus, setGeocodeStatus] = useState<"idle" | "loading" | "done">("idle");
  const [submitStatus, setSubmitStatus]   = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  // Debounce reverse geocoding so we don't call Nominatim on every drag pixel
  const geocodeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const geocode = useCallback(async (latVal: number, lngVal: number) => {
    setGeocodeStatus("loading");
    const addr = await reverseGeocode(latVal, lngVal);
    setStreetAddress(addr);
    setGeocodeStatus("done");
  }, []);

  const scheduleGeocode = useCallback((latVal: number, lngVal: number) => {
    if (geocodeTimer.current) clearTimeout(geocodeTimer.current);
    geocodeTimer.current = setTimeout(() => geocode(latVal, lngVal), 600);
  }, [geocode]);

  // Acquire GPS on mount
  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsStatus("denied");
      geocode(DEFAULT_LAT, DEFAULT_LNG);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setLat(latitude);
        setLng(longitude);
        setGpsStatus("ready");
        geocode(latitude, longitude);
      },
      () => {
        setGpsStatus("denied");
        geocode(DEFAULT_LAT, DEFAULT_LNG);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, [geocode]);

  async function handleConfirm() {
    if (!streetAddress || !streetSide) return;
    setSubmitStatus("loading");
    setErrorMsg("");

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    // Find the user's car
    const { data: subs } = await supabase
      .from("car_subscriptions")
      .select("car_id")
      .eq("user_id", user.id)
      .limit(1)
      .single();

    if (!subs?.car_id) {
      router.push("/setup");
      return;
    }

    // Fetch cleaning schedule & compute next move time
    const windows  = await fetchCleaningSchedule(streetAddress, streetSide);
    const moveDate = nextMoveAt(windows);

    // Insert parking log — trigger will deactivate prior logs automatically
    const { error } = await supabase.from("parking_logs").insert({
      car_id:         subs.car_id,
      logged_by:      user.id,
      latitude:       lat,
      longitude:      lng,
      street_address: streetAddress,
      street_side:    streetSide,
      next_move_at:   moveDate?.toISOString() ?? null,
    });

    if (error) {
      setSubmitStatus("error");
      setErrorMsg(error.message);
      return;
    }

    setSubmitStatus("success");
    // Brief success pause, then return to dashboard
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

  return (
    <div className="relative w-full h-[100dvh]">

      {/* ── Map — crosshair style: map moves, pin stays centred ── */}
      <ParkingMap
        lat={lat}
        lng={lng}
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

      {/* ── GPS acquiring banner ── */}
      {gpsStatus === "acquiring" && (
        <div className="absolute top-20 inset-x-0 z-10 flex justify-center pointer-events-none">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[--color-primary] text-white text-xs font-semibold shadow-md">
            <Loader2 size={12} className="animate-spin" />
            Locating you…
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
                    : streetAddress || "Move the map to set location"
                  }
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (navigator.geolocation) {
                    setGpsStatus("acquiring");
                    navigator.geolocation.getCurrentPosition(
                      (pos) => {
                        setLat(pos.coords.latitude);
                        setLng(pos.coords.longitude);
                        setGpsStatus("ready");
                        geocode(pos.coords.latitude, pos.coords.longitude);
                      },
                      () => setGpsStatus("denied"),
                      { enableHighAccuracy: true }
                    );
                  }
                }}
                className="flex-shrink-0 w-8 h-8 rounded-full bg-white border border-[--color-border] flex items-center justify-center text-[--color-text-secondary] hover:text-[--color-primary] transition-colors"
                aria-label="Re-centre on my location"
              >
                <Navigation size={13} />
              </button>
            </div>

            <div className="border-t border-[--color-border]" />

            {/* Street side picker */}
            <div className="flex justify-center">
              <StreetSidePicker value={streetSide} onChange={setStreetSide} />
            </div>

            {errorMsg && (
              <p className="text-xs text-[--color-danger] bg-[--color-danger-light] rounded-[var(--radius-sm)] px-3 py-2">
                {errorMsg}
              </p>
            )}

            {/* Confirm button */}
            <Button
              variant="cta"
              size="lg"
              className="w-full"
              onClick={handleConfirm}
              disabled={
                submitStatus === "loading" ||
                !streetAddress ||
                !streetSide ||
                geocodeStatus === "loading"
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
