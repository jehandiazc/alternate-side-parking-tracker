import type { StreetSide } from "@/types";

// ─────────────────────────────────────────────────────────────────────────────
// NYC Open Data — Street Cleaning Regulations
// Dataset: https://data.cityofnewyork.us/City-Government/Street-Cleaning-Regulations/svxs-53pd
// ─────────────────────────────────────────────────────────────────────────────

const DATASET_ID = "svxs-53pd";
const BASE_URL   = "https://data.cityofnewyork.us/resource";

interface RawScheduleRow {
  street?:   string;
  fromstr?:  string;
  tostr?:    string;
  side?:     string;
  day?:      string;      // "Mon", "Tue", "Mon,Wed", etc.
  fromhour?: string;      // "0800"
  tohour?:   string;      // "0930"
  boro?:     string;
  reg?:      string;      // regulation code
}

export interface CleaningWindow {
  day:        number;    // 0 = Sunday … 6 = Saturday
  startHour:  number;    // e.g. 8.0 = 8:00 AM
  startMin:   number;
  endHour:    number;
  endMin:     number;
  rawDay:     string;
}

// Normalize a street name for querying, e.g.:
//   "West 84th Street" → "W 84 ST"
//   "Broadway"         → "BROADWAY"
//   "5th Avenue"       → "5 AVE"
export function normalizeStreetName(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/\bWEST\b/g,      "W")
    .replace(/\bEAST\b/g,      "E")
    .replace(/\bNORTH\b/g,     "N")
    .replace(/\bSOUTH\b/g,     "S")
    .replace(/\bSTREET\b/g,    "ST")
    .replace(/\bAVENUE\b/g,    "AVE")
    .replace(/\bBOULEVARD\b/g, "BLVD")
    .replace(/\bPLACE\b/g,     "PL")
    .replace(/\bDRIVE\b/g,     "DR")
    .replace(/\bROAD\b/g,      "RD")
    .replace(/\bCOURT\b/g,     "CT")
    .replace(/\bLANE\b/g,      "LN")
    .replace(/\bTERRACE\b/g,   "TER")
    .replace(/\b(\d+)(ST|ND|RD|TH)\b/g, "$1") // "84TH" → "84"
    .replace(/\s+/g, " ")
    .trim();
}

// Parse "0800" → { hour: 8, min: 0 }
function parseTime(raw: string = "0800"): { hour: number; min: number } {
  const padded = raw.padStart(4, "0");
  return {
    hour: parseInt(padded.slice(0, 2), 10),
    min:  parseInt(padded.slice(2, 4), 10),
  };
}

// Map 3-letter day abbreviation → JS day-of-week index
const DAY_MAP: Record<string, number> = {
  SUN: 0, MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6,
};

function parseDays(raw: string = ""): number[] {
  return raw
    .toUpperCase()
    .split(/[,\s]+/)
    .map((d) => d.trim().slice(0, 3))
    .filter((d) => d in DAY_MAP)
    .map((d) => DAY_MAP[d]);
}

// Fetch cleaning windows for a street + side from NYC Open Data
export async function fetchCleaningSchedule(
  streetAddress: string,
  side: StreetSide
): Promise<CleaningWindow[]> {
  const normalized = normalizeStreetName(streetAddress);

  const params = new URLSearchParams({
    "$where": `upper(street)='${normalized}' AND upper(side)='${side}'`,
    "$limit": "10",
  });

  if (process.env.NYC_OPEN_DATA_APP_TOKEN) {
    params.set("$$app_token", process.env.NYC_OPEN_DATA_APP_TOKEN);
  }

  const res = await fetch(
    `${BASE_URL}/${DATASET_ID}.json?${params.toString()}`,
    { next: { revalidate: 86400 } } // cache for 24 hours — schedule rarely changes
  );

  if (!res.ok) {
    console.error("NYC Open Data fetch failed:", res.status, await res.text());
    return [];
  }

  const rows: RawScheduleRow[] = await res.json();

  const windows: CleaningWindow[] = [];

  for (const row of rows) {
    const days = parseDays(row.day);
    const start = parseTime(row.fromhour);
    const end   = parseTime(row.tohour);

    for (const day of days) {
      windows.push({
        day,
        startHour: start.hour,
        startMin:  start.min,
        endHour:   end.hour,
        endMin:    end.min,
        rawDay:    row.day ?? "",
      });
    }
  }

  return windows;
}

// Given cleaning windows, calculate the next datetime the car must be moved.
// Returns null if no schedule found (e.g. unrecognised street).
export function nextMoveAt(windows: CleaningWindow[], from: Date = new Date()): Date | null {
  if (windows.length === 0) return null;

  let earliest: Date | null = null;

  for (const w of windows) {
    // Build a candidate date: next occurrence of w.day at w.startHour:w.startMin
    const candidate = new Date(from);

    // How many days ahead is this weekday?
    const daysAhead = (w.day - candidate.getDay() + 7) % 7;
    candidate.setDate(candidate.getDate() + daysAhead);
    candidate.setHours(w.startHour, w.startMin, 0, 0);

    // If that time has already passed today, advance by 7 days
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
// Reverse geocode lat/lng → street address using Nominatim (OSM, free)
// ─────────────────────────────────────────────────────────────────────────────

export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
    {
      headers: { "User-Agent": "ParkShare/1.0 (alternate-side-parking-tracker)" },
    }
  );

  if (!res.ok) return "";

  const data = await res.json();
  const addr = data.address ?? {};

  // Build a short street address like "W 84th St"
  const road = addr.road ?? addr.pedestrian ?? addr.path ?? "";
  return road;
}
