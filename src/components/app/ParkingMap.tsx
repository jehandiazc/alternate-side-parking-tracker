"use client";

import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, Tooltip, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// ─── Custom car marker ───────────────────────────────────────────────────────

const CAR_ICON = L.divIcon({
  className: "",
  iconSize: [48, 56],
  iconAnchor: [24, 56],
  popupAnchor: [0, -56],
  html: `
    <div style="position:relative;width:48px;height:56px;filter:drop-shadow(0 4px 12px rgba(45,53,97,0.45))">
      <svg viewBox="0 0 48 56" fill="none" xmlns="http://www.w3.org/2000/svg" width="48" height="56">
        <path d="M24 0C14.06 0 6 8.06 6 18C6 31.5 24 56 24 56C24 56 42 31.5 42 18C42 8.06 33.94 0 24 0Z" fill="#2D3561"/>
        <circle cx="24" cy="18" r="13" fill="#FAF8F4"/>
      </svg>
      <div style="position:absolute;top:5px;left:50%;transform:translateX(-50%);font-size:15px;line-height:1;user-select:none">🚗</div>
    </div>
  `,
});

// ─── FlyTo: smoothly recentres the map when lat/lng props change ─────────────
// Used on the dashboard — fires on every prop change.

function FlyTo({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  const isFirst = useRef(true);
  useEffect(() => {
    if (isFirst.current) {
      map.setView([lat, lng], 17);
      isFirst.current = false;
    } else {
      map.flyTo([lat, lng], 17, { duration: 1.2 });
    }
  }, [lat, lng, map]);
  return null;
}

// ─── ProgrammaticFlyTo: fires only when `seq` increments ────────────────────
// Used on the park page for GPS acquisition and re-centre button.
// seq=0 is the initial no-op (MapContainer centre handles that).

function ProgrammaticFlyTo({ lat, lng, seq }: { lat: number; lng: number; seq: number }) {
  const map = useMap();
  const prevSeq = useRef(-1);
  useEffect(() => {
    if (seq > 0 && seq !== prevSeq.current) {
      prevSeq.current = seq;
      map.flyTo([lat, lng], 18, { duration: 1.0 });
    }
  }, [seq, lat, lng, map]);
  return null;
}

// ─── CenterTracker: fires onCenterChange as the user drags the map ──────────

function CenterTracker({ onChange }: { onChange: (lat: number, lng: number) => void }) {
  useMapEvents({
    moveend(e) {
      const c = e.target.getCenter();
      onChange(c.lat, c.lng);
    },
  });
  return null;
}

// ─── Tile URL ─────────────────────────────────────────────────────────────────
// MapTiler Aquarelle — watercolor style, free tier 100k req/month.
// Falls back to CARTO Positron if the key is absent (CI, cold preview).

function tileUrl(): string {
  const key = process.env.NEXT_PUBLIC_MAPTILER_API_KEY;
  if (key) return `https://api.maptiler.com/maps/aquarelle/{z}/{x}/{y}.png?key=${key}`;
  return "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
}

// ─────────────────────────────────────────────────────────────────────────────

/** Vehicle details shown when the marker is tapped/hovered on the dashboard. */
export interface MapCarDetails {
  name: string;
  make?: string | null;
  model?: string | null;
  color?: string | null;
}

interface ParkingMapProps {
  lat: number;
  lng: number;
  className?: string;
  /** Park page: hide the marker, show a fixed crosshair, track map centre */
  showCrosshair?: boolean;
  onCenterChange?: (lat: number, lng: number) => void;
  /**
   * Park page: increment seq to programmatically fly to lat/lng.
   * seq=0 → no-op (initial render). seq>0 → fly.
   */
  flySeq?: number;
  /** Dashboard: show the car's name + make/model/color on the marker. */
  carDetails?: MapCarDetails;
}

export default function ParkingMap({
  lat,
  lng,
  className = "",
  showCrosshair = false,
  onCenterChange,
  flySeq = 0,
  carDetails,
}: ParkingMapProps) {
  const markerRef = useRef<L.Marker>(null);

  // "Silver Honda Civic" — only the parts that are filled in.
  const carSpec = carDetails
    ? [carDetails.color, carDetails.make, carDetails.model].filter(Boolean).join(" ")
    : "";

  return (
    <div className={`relative ${className}`}>
      <MapContainer
        center={[lat, lng]}
        zoom={17}
        zoomControl={false}
        attributionControl={false}
        scrollWheelZoom={true}
        dragging={true}
        touchZoom={true}
        doubleClickZoom={true}
        style={{ width: "100%", height: "100%", background: "#e8e0d0" }}
      >
        <TileLayer
          url={tileUrl()}
          maxZoom={20}
          maxNativeZoom={20}
          minZoom={10}
          attribution='&copy; <a href="https://www.maptiler.com/copyright/">MapTiler</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

        {/* Dashboard mode: marker + smooth follow */}
        {!showCrosshair && (
          <>
            <Marker position={[lat, lng]} icon={CAR_ICON} ref={markerRef}>
              {carDetails && (
                <>
                  {/* Desktop: name on hover */}
                  <Tooltip direction="top" offset={[0, -52]} opacity={1}>
                    {carDetails.name}
                  </Tooltip>
                  {/* Tap (works on mobile): full details */}
                  <Popup offset={[0, -44]} closeButton={false}>
                    <div style={{ textAlign: "center", lineHeight: 1.3 }}>
                      <div style={{ fontWeight: 800, color: "#2D3561", fontSize: 14 }}>
                        🚗 {carDetails.name}
                      </div>
                      {carSpec && (
                        <div style={{ fontSize: 12, color: "#6b6b7a", marginTop: 2 }}>
                          {carSpec}
                        </div>
                      )}
                    </div>
                  </Popup>
                </>
              )}
            </Marker>
            <FlyTo lat={lat} lng={lng} />
          </>
        )}

        {/* Park mode: programmatic GPS fly-to + centre tracking */}
        {showCrosshair && (
          <>
            <ProgrammaticFlyTo lat={lat} lng={lng} seq={flySeq} />
            {onCenterChange && <CenterTracker onChange={onCenterChange} />}
          </>
        )}
      </MapContainer>

      {/* Fixed crosshair overlay */}
      {showCrosshair && (
        <div
          className="absolute inset-0 z-[400] pointer-events-none flex items-center justify-center"
          aria-hidden
        >
          <div style={{ filter: "drop-shadow(0 4px 12px rgba(45,53,97,0.45))" }}>
            <svg viewBox="0 0 48 56" fill="none" width="48" height="56">
              <path
                d="M24 0C14.06 0 6 8.06 6 18C6 31.5 24 56 24 56C24 56 42 31.5 42 18C42 8.06 33.94 0 24 0Z"
                fill="#2D3561"
              />
              <circle cx="24" cy="18" r="13" fill="#FAF8F4" />
            </svg>
            <div
              style={{
                position: "absolute",
                top: "5px",
                left: "50%",
                transform: "translateX(-50%)",
                fontSize: "15px",
                lineHeight: 1,
              }}
            >
              🚗
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
