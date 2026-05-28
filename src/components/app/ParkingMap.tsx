"use client";

import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
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
// CARTO Positron — clean light style, no authentication required.
// Falls back gracefully everywhere (localhost, preview, production).

function tileUrl(): string {
  return "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
}

// ─────────────────────────────────────────────────────────────────────────────

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
}

export default function ParkingMap({
  lat,
  lng,
  className = "",
  showCrosshair = false,
  onCenterChange,
  flySeq = 0,
}: ParkingMapProps) {
  const markerRef = useRef<L.Marker>(null);

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
          maxZoom={19}
          maxNativeZoom={19}
          minZoom={10}
          subdomains="abcd"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />

        {/* Dashboard mode: marker + smooth follow */}
        {!showCrosshair && (
          <>
            <Marker position={[lat, lng]} icon={CAR_ICON} ref={markerRef} />
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
