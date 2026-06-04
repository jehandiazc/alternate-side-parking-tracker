import type { StreetSide } from "@/types";

// ─────────────────────────────────────────────────────────────────────────────
// NYC DOT — Parking Regulation Locations and Signs
// Dataset: https://data.cityofnewyork.us/Transportation/Parking-Regulation-Locations-and-Signs/nfid-uabd
//
// This is the authoritative source for all NYC parking signs, including
// alternate-side (street cleaning) regulations.  The previous dataset
// svxs-53pd ("Street Cleaning Regulations") was retired and now returns 404.
//
// Signs are identified by sign_description containing "SANITATION BROOM SYMBOL".
// Street names use DOT's right-justified number format, e.g. "WEST   84 STREET".
// ─────────────────────────────────────────────────────────────────────────────

const DOT_DATASET_ID = "nfid-uabd";
const DOT_BASE_URL   = "https://data.cityofnewyork.us/resource";

export interface CleaningWindow {
  day:       number;  // 0 = Sunday … 6 = Saturday
  startHour: number;
  startMin:  number;
  endHour:   number;
  endMin:    number;
  rawDay:    string;  // original day text from sign, e.g. "MONDAY THURSDAY"
}

// ─── Street name formatting for the DOT dataset ──────────────────────────────

/**
 * Convert a street name from Nominatim format to the DOT signs dataset format.
 *
 * DOT uses right-justified numbering for directional streets:
 *   "West 84th Street" → "WEST   84 STREET"
 *   "East 149th Street" → "EAST  149 STREET"
 *
 * Named streets and avenues are just uppercased:
 *   "Amsterdam Avenue" → "AMSTERDAM AVENUE"
 *   "5th Avenue"       → "5 AVENUE"
 *   "Broadway"         → "BROADWAY"
 */
export function formatStreetForDOT(streetName: string): string {
  let s = streetName
    .trim()
    .toUpperCase()
    // Strip leading house number (safety net for old DB rows)
    .replace(/^\d+[A-Z]?\s+/, "")
    // Remove ordinal suffixes: "84TH" → "84", "1ST" → "1"
    .replace(/\b(\d+)(?:ST|ND|RD|TH)\b/g, "$1")
    // Expand common abbreviations (in case DB stored abbreviated names)
    .replace(/\bW\b/g,    "WEST")
    .replace(/\bE\b/g,    "EAST")
    .replace(/\bN\b/g,    "NORTH")
    .replace(/\bS\b/g,    "SOUTH")
    .replace(/\bST\b/g,   "STREET")
    .replace(/\bAVE\b/g,  "AVENUE")
    .replace(/\bBLVD\b/g, "BOULEVARD")
    .replace(/\bPL\b/g,   "PLACE")
    .replace(/\bDR\b/g,   "DRIVE")
    .replace(/\bRD\b/g,   "ROAD");

  // Directional numbered streets: apply DOT's right-justified 5-char number field.
  //   "WEST 84 STREET"  → "WEST   84 STREET"  (padStart(5) on the number)
  //   "EAST 149 STREET" → "EAST  149 STREET"
  const m = s.match(/^(WEST|EAST|NORTH|SOUTH)\s+(\d{1,4})\s+(.+)$/);
  if (m) {
    return `${m[1]}${m[2].padStart(5)} ${m[3].trim()}`;
  }

  return s.replace(/\s+/g, " ").trim();
}

// ─── Sign description parsing ─────────────────────────────────────────────────

// All day-name tokens that can appear in DOT sign descriptions
const DOT_DAY_MAP: Record<string, number> = {
  SUNDAY: 0,   SUN: 0,
  MONDAY: 1,   MON: 1,
  TUESDAY: 2,  TUE: 2,  TUES: 2,
  WEDNESDAY: 3, WED: 3,
  THURSDAY: 4, THU: 4,  THUR: 4, THURS: 4,
  FRIDAY: 5,   FRI: 5,
  SATURDAY: 6, SAT: 6,
};

/** Parse a DOT time token like "9:30AM", "11AM", "MIDNIGHT", "NOON". */
function parseDOTTime(s: string): { hour: number; min: number } | null {
  const t = s.toUpperCase().trim();
  if (t === "MIDNIGHT") return { hour: 0, min: 0 };
  if (t === "NOON")     return { hour: 12, min: 0 };

  const m = t.match(/^(\d{1,2})(?::(\d{2}))?(AM|PM)$/);
  if (!m) return null;

  let hour = parseInt(m[1], 10);
  const min  = m[2] ? parseInt(m[2], 10) : 0;
  if (m[3] === "PM" && hour !== 12) hour += 12;
  if (m[3] === "AM" && hour === 12) hour  = 0;
  return { hour, min };
}

/**
 * Parse an ASP sign description into CleaningWindow[].
 *
 * Handles formats like:
 *   "NO PARKING (SANITATION BROOM SYMBOL) MONDAY THURSDAY 9:30AM-11AM <-> ..."
 *   "NO PARKING (SANITATION BROOM SYMBOL) TUESDAY FRIDAY 8:30AM-10AM --> ..."
 *   "NIGHT REGULATION ... SANITATION BROOM SYMBOL) 2AM-5AM MON & THURS <--->"
 */
export function parseASPSignDescription(desc: string): CleaningWindow[] {
  // Extract schedule text: everything after "SANITATION BROOM[M] [SYMBOL])"
  // and before the directional arrow or "(SUPERSEDES…".
  //
  // DOT arrows are always preceded by whitespace and consist of 2+ chars from
  // the set [<>-], e.g. " <->", " -->", " <--->".  A single "-" between times
  // (e.g. "9:30AM-11AM") is not preceded by a space and won't match.
  const schedMatch = desc.match(
    /SANITATION\s+BROOM{1,2}(?:\s+SYMBOL)?\)\s*([\s\S]*?)(?:\s+[<>\-]{2,}|\s*\(|$)/i
  );
  if (!schedMatch) return [];

  const schedText = schedMatch[1].trim();
  if (!schedText) return [];

  // Find the time range within schedText.
  // Formats: "9:30AM-11AM", "2AM-5AM", "MIDNIGHT TO 3AM", "8AM TO 9:30AM"
  const timeMatch = schedText.match(
    /(MIDNIGHT|NOON|\d{1,2}(?::\d{2})?(?:AM|PM))\s*(?:TO\s*-?\s*|-\s*)(MIDNIGHT|NOON|\d{1,2}(?::\d{2})?(?:AM|PM))/i
  );
  if (!timeMatch) return [];

  const start = parseDOTTime(timeMatch[1]);
  const end   = parseDOTTime(timeMatch[2]);
  if (!start || !end) return [];

  // Remove the time range from schedText to isolate the day tokens
  const dayText = schedText.replace(timeMatch[0], "").replace(/&/g, " ");

  // Find all recognisable day names in dayText
  const days: number[] = [];
  for (const tok of dayText.split(/[\s,]+/)) {
    const clean = tok.replace(/[^A-Z]/gi, "").toUpperCase();
    if (clean && clean in DOT_DAY_MAP && !days.includes(DOT_DAY_MAP[clean])) {
      days.push(DOT_DAY_MAP[clean]);
    }
  }
  if (days.length === 0) return [];

  return days.map((day) => ({
    day,
    startHour: start.hour,
    startMin:  start.min,
    endHour:   end.hour,
    endMin:    end.min,
    rawDay:    dayText.trim(),
  }));
}

// ─── NYC State Plane (EPSG:2263) forward transform ───────────────────────────
//
// The DOT signs dataset stores sign positions in NY State Plane Long Island
// coordinates (US survey feet).  We use this to find which block segment a
// parked car is on, so we can show only the relevant cleaning windows.
//
// Reference: Snyder "Map Projections — A Working Manual", Lambert Conformal
// Conic equations (§15).  Parameters for EPSG:2263 (NAD83):
//
//   Ellipsoid  GRS80   a = 20925604.47 US survey feet
//   Parallels  φ1 = 40°40'N   φ2 = 41°02'N
//   Origin     φ0 = 40°10'N   λ0 = -74°00'W
//   False E    E0 = 984250.00 US survey feet

const _SP_A   = 20925604.47;
const _SP_E2  = 0.006694379990141;
const _SP_E   = Math.sqrt(_SP_E2);
const _SP_E0  = 984250.0;
const _TO_RAD = Math.PI / 180;

function _mFn(phi: number) {
  const s = Math.sin(phi);
  return Math.cos(phi) / Math.sqrt(1 - _SP_E2 * s * s);
}
function _tFn(phi: number) {
  const s = Math.sin(phi);
  return Math.tan(Math.PI / 4 - phi / 2) *
    Math.pow((1 + _SP_E * s) / (1 - _SP_E * s), _SP_E / 2);
}

const _phi1 = (40 + 40 / 60) * _TO_RAD;
const _phi2 = (41 +  2 / 60) * _TO_RAD;
const _phi0 = (40 + 10 / 60) * _TO_RAD;
const _lam0 = -74.0 * _TO_RAD;

const _m1 = _mFn(_phi1), _m2 = _mFn(_phi2);
const _t1 = _tFn(_phi1), _t2 = _tFn(_phi2), _t0 = _tFn(_phi0);
const _n   = (Math.log(_m1) - Math.log(_m2)) / (Math.log(_t1) - Math.log(_t2));
const _F   = _m1 / (_n * Math.pow(_t1, _n));
const _rh0 = _SP_A * _F * Math.pow(_t0, _n);

/** Convert WGS84 lat/lng to NY State Plane Long Island (US survey feet). */
function latlngToStatePlane(lat: number, lng: number): { x: number; y: number } {
  const phi = lat * _TO_RAD;
  const lam = lng * _TO_RAD;
  const t   = _tFn(phi);
  const rho = _SP_A * _F * Math.pow(t, _n);
  const th  = _n * (lam - _lam0);
  return {
    x: _SP_E0 + rho * Math.sin(th),
    y: _rh0   - rho * Math.cos(th),
  };
}

// ─── Main schedule fetch ──────────────────────────────────────────────────────

interface RawDotRow {
  sign_description: string;
  from_street:      string;
  to_street:        string;
  sign_x_coord:     string;
  sign_y_coord:     string;
}

/**
 * Fetch alternate-side parking cleaning windows for a street + side.
 * Queries the DOT Parking Regulation Locations and Signs dataset (nfid-uabd).
 *
 * When `coords` is supplied the result is filtered to the single block segment
 * nearest to the car's position, using the sign coordinates in the dataset to
 * identify block boundaries in NY State Plane space.
 * Without `coords` all windows for the whole street are returned (fallback).
 */
export async function fetchCleaningSchedule(
  streetAddress: string,
  side: StreetSide,
  coords?: { lat: number; lng: number }
): Promise<CleaningWindow[]> {
  const dotStreet = formatStreetForDOT(streetAddress);

  const where = `on_street='${dotStreet}' AND side_of_street='${side}' AND sign_description LIKE '%SANITATION BROOM%'`;

  const params = new URLSearchParams({
    "$where":  where,
    "$select": "sign_description,from_street,to_street,sign_x_coord,sign_y_coord",
    "$limit":  "100",
  });

  const res = await fetch(
    `${DOT_BASE_URL}/${DOT_DATASET_ID}.json?${params.toString()}`,
    { next: { revalidate: 86400 } }
  );

  if (!res.ok) {
    console.error("DOT signs fetch failed:", res.status, await res.text());
    return [];
  }

  const rows: RawDotRow[] = await res.json();
  if (rows.length === 0) return [];

  // ── Block filtering ────────────────────────────────────────────────────────
  // Group rows by (from_street, to_street) block.  When coordinates are
  // supplied, pick the block whose sign centroid is closest to the car.

  type Block = { key: string; from: string; to: string; rows: RawDotRow[] };
  const blockMap = new Map<string, Block>();

  for (const row of rows) {
    if (!row.from_street || !row.to_street) continue;
    const key = `${row.from_street}||${row.to_street}`;
    if (!blockMap.has(key)) {
      blockMap.set(key, { key, from: row.from_street, to: row.to_street, rows: [] });
    }
    blockMap.get(key)!.rows.push(row);
  }

  const blocks = Array.from(blockMap.values());

  let targetRows: RawDotRow[];

  if (!coords || blocks.length <= 1) {
    // No coordinates or only one block — use all rows
    targetRows = rows;
  } else {
    // Convert car position to State Plane
    const carSP = latlngToStatePlane(coords.lat, coords.lng);

    // For each block: find the median X of its signs (more robust than mean against
    // outliers placed at intersection corners).  Use midpoints of X gaps between
    // adjacent blocks as boundaries — this is more accurate than centroids.

    // Compute centroids and sort blocks by X (ascending = west to east)
    const withCentroid = blocks.map((b) => {
      const xs = b.rows
        .map((r) => parseFloat(r.sign_x_coord))
        .filter((x) => !isNaN(x))
        .sort((a, z) => a - z);
      const mid = xs[Math.floor(xs.length / 2)] ?? 0;
      return { ...b, centroidX: mid };
    }).sort((a, z) => a.centroidX - z.centroidX);

    // Build boundaries as midpoints of adjacent centroid gaps
    const boundaries: number[] = [];
    for (let i = 0; i < withCentroid.length - 1; i++) {
      boundaries.push((withCentroid[i].centroidX + withCentroid[i + 1].centroidX) / 2);
    }

    // Find which slot the car falls into
    let idx = 0;
    for (let i = 0; i < boundaries.length; i++) {
      if (carSP.x >= boundaries[i]) idx = i + 1;
    }

    targetRows = withCentroid[idx].rows;
  }

  // ── Parse and deduplicate ─────────────────────────────────────────────────
  const seen    = new Set<string>();
  const windows: CleaningWindow[] = [];

  for (const row of targetRows) {
    for (const w of parseASPSignDescription(row.sign_description)) {
      const key = `${w.day}:${w.startHour}:${w.startMin}:${w.endHour}:${w.endMin}`;
      if (!seen.has(key)) {
        seen.add(key);
        windows.push(w);
      }
    }
  }

  return windows;
}

// ─── Next-move calculation ────────────────────────────────────────────────────

/**
 * Given cleaning windows, return the next datetime the car must be moved.
 * Returns null if no windows (street has no ASP regulations).
 */
export function nextMoveAt(windows: CleaningWindow[], from: Date = new Date()): Date | null {
  if (windows.length === 0) return null;

  let earliest: Date | null = null;

  for (const w of windows) {
    const candidate = new Date(from);
    const daysAhead = (w.day - candidate.getDay() + 7) % 7;
    candidate.setDate(candidate.getDate() + daysAhead);
    candidate.setHours(w.startHour, w.startMin, 0, 0);

    if (candidate <= from) {
      candidate.setDate(candidate.getDate() + 7);
    }

    if (!earliest || candidate < earliest) {
      earliest = candidate;
    }
  }

  return earliest;
}

// ─────────────────────────────────────────────────────────────────────────────
// Reverse geocode lat/lng → address + road centerline using Nominatim (OSM)
// ─────────────────────────────────────────────────────────────────────────────

export interface GeocodeResult {
  /** Road name from Nominatim: "West 84th Street" — stored in DB, used for DOT query */
  streetName: string;
  /** House number if Nominatim found one: "155" */
  houseNumber: string;
  /** Human-readable address for display: "155 West 84th Street" */
  displayAddress: string;
  /**
   * Road centerline lat/lng (Nominatim zoom=17).
   * Used by autoDetectSide to compare pin vs centreline position.
   */
  roadLat: number;
  roadLng: number;
}

const NOMINATIM_HEADERS = {
  "User-Agent": "ParkShare/1.0 (alternate-side-parking-tracker)",
};

export async function reverseGeocode(lat: number, lng: number): Promise<GeocodeResult> {
  // Two parallel calls:
  //   zoom=18 → building-level (house number + street name)
  //   zoom=17 → road-level (road centreline lat/lng)
  const [addrRes, roadRes] = await Promise.all([
    fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1&zoom=18`,
      { headers: NOMINATIM_HEADERS }
    ),
    fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=17`,
      { headers: NOMINATIM_HEADERS }
    ),
  ]);

  const [addrData, roadData] = await Promise.all([
    addrRes.ok ? addrRes.json() : null,
    roadRes.ok ? roadRes.json() : null,
  ]);

  const addr          = addrData?.address ?? {};
  const streetName    = addr.road ?? addr.pedestrian ?? addr.path ?? "";
  const houseNumber   = addr.house_number ?? "";
  const displayAddress = houseNumber ? `${houseNumber} ${streetName}` : streetName;

  const roadLat = roadData ? parseFloat(roadData.lat) : lat;
  const roadLng = roadData ? parseFloat(roadData.lon) : lng;

  return { streetName, houseNumber, displayAddress, roadLat, roadLng };
}

// ─────────────────────────────────────────────────────────────────────────────
// Auto-detect which side of the street a pin is on.
// ─────────────────────────────────────────────────────────────────────────────

export function detectStreetOrientation(streetName: string): "EW" | "NS" {
  const s = streetName.toUpperCase();
  if (/\b(W|E|WEST|EAST)\s*\d+/.test(s) || /\b\d+\s*(ST\b|STREET\b)/.test(s)) return "EW";
  if (
    /\b(AVE\b|AVENUE\b|BLVD\b|BOULEVARD\b|BROADWAY|RIVERSIDE|AMSTERDAM|COLUMBUS|LEXINGTON|MADISON|LENOX)/.test(s)
  )
    return "NS";
  return "EW";
}

export function autoDetectSide(
  pinLat: number,
  pinLng: number,
  result: GeocodeResult
): StreetSide {
  const orientation = detectStreetOrientation(result.streetName);
  return orientation === "EW"
    ? pinLat >= result.roadLat ? "N" : "S"
    : pinLng >= result.roadLng ? "E" : "W";
}
