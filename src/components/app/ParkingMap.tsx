"use client";

import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// ─── Custom car marker ───────────────────────────────────────────────────────
// Leaflet's default marker icon breaks in Next.js (webpack asset path issue).
// We define our own SVG-based icon instead.

const CAR_ICON = L.divIcon({
  className: "",
  iconSize: [48, 56],
  iconAnchor: [24, 56],   // bottom-center of the pin
  popupAnchor: [0, -56],
  html: `
    <div style="position:relative;width:48px;height:56px;filter:drop-shadow(0 4px 12px rgba(45,53,97,0.45))">
      <!-- Pin body -->
      <svg viewBox="0 0 48 56" fill="none" xmlns="http://www.w3.org/2000/svg" width="48" height="56">
        <path d="M24 0C14.06 0 6 8.06 6 18C6 31.5 24 56 24 56C24 56 42 31.5 42 18C42 8.06 33.94 0 24 0Z" fill="#2D3561"/>
        <circle cx="24" cy="18" r="13" fill="#FAF8F4"/>
      </svg>
      <!-- Car emoji centered in the circle -->
      <div style="position:absolute;top:5px;left:50%;transform:translateX(-50%);font-size:15px;line-height:1;user-select:none">🚗</div>
    </div>
  `,
});

// ─── Recenter helper ─────────────────────────────────────────────────────────
// Smoothly flies to a new position when the logged location changes.

function FlyTo({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lng], 17, { duration: 1.2 });
  }, [lat, lng, map]);
  return null;
}

// ─── Component ───────────────────────────────────────────────────────────────

interface ParkingMapProps {
  lat: number;
  lng: number;
  className?: string;
}

export default function ParkingMap({ lat, lng, className = "" }: ParkingMapProps) {
  const markerRef = useRef<L.Marker>(null);

  return (
    <MapContainer
      center={[lat, lng]}
      zoom={17}
      zoomControl={false}
      attributionControl={false}
      scrollWheelZoom={false}
      dragging={true}
      className={className}
      style={{ background: "#e8e0d0" }}   // warm fallback while tiles load
    >
      {/*
        Stamen Watercolor — hand-painted, soft watercolor aesthetic.
        Served by Stadia Maps. Free for localhost dev; add STADIA_API_KEY for production.
        Docs: https://docs.stadiamaps.com/map-styles/stamen-watercolor/
      */}
      <TileLayer
        url="https://tiles.stadiamaps.com/tiles/stamen_watercolor/{z}/{x}/{y}.jpg"
        // Uncomment for production with API key:
        // url={`https://tiles.stadiamaps.com/tiles/stamen_watercolor/{z}/{x}/{y}.jpg?api_key=${process.env.NEXT_PUBLIC_STADIA_API_KEY}`}
        maxZoom={18}
        minZoom={10}
      />

      {/* Subtle Stamen Toner Labels overlay — just street names, no fills */}
      <TileLayer
        url="https://tiles.stadiamaps.com/tiles/stamen_toner_labels/{z}/{x}/{y}.png"
        maxZoom={20}
        opacity={0.55}
      />

      <Marker position={[lat, lng]} icon={CAR_ICON} ref={markerRef} />
      <FlyTo lat={lat} lng={lng} />
    </MapContainer>
  );
}
