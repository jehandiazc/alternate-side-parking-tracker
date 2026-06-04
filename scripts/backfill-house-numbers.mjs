#!/usr/bin/env node
/**
 * Retroactively populate house_number and display_address for parking_logs
 * rows that were logged before these columns existed.
 *
 * Usage:
 *   node scripts/backfill-house-numbers.mjs
 *
 * Requires .env.local with:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY    ← bypasses RLS, needed to update all rows
 */

import { readFileSync } from "fs";
import { resolve } from "path";

// ── Load .env.local manually (no dotenv dep required) ─────────────────────────
const envPath = resolve(process.cwd(), ".env.local");
let envVars = {};
try {
  const raw = readFileSync(envPath, "utf-8");
  for (const line of raw.split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) envVars[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
  }
} catch {
  console.error("Could not read .env.local — make sure it exists in the project root.");
  process.exit(1);
}

const SUPABASE_URL      = envVars.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY  = envVars.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const HEADERS = {
  apikey:        SERVICE_ROLE_KEY,
  Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
  "Content-Type": "application/json",
  Prefer:        "return=minimal",
};

const NOMINATIM = "https://nominatim.openstreetmap.org/reverse";
const NOM_HEADERS = { "User-Agent": "ParkShare/1.0 (backfill-house-numbers)" };

// ── Helpers ───────────────────────────────────────────────────────────────────

async function reverseGeocode(lat, lng) {
  const url = `${NOMINATIM}?lat=${lat}&lon=${lng}&format=json&addressdetails=1&zoom=18`;
  const res  = await fetch(url, { headers: NOM_HEADERS });
  if (!res.ok) return { houseNumber: "", streetName: "" };
  const data  = await res.json();
  const addr  = data?.address ?? {};
  return {
    houseNumber: addr.house_number ?? "",
    streetName:  addr.road ?? addr.pedestrian ?? addr.path ?? "",
  };
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

// ── Fetch rows that need backfilling ──────────────────────────────────────────

async function fetchRows() {
  // Rows where house_number is NULL — these are the ones that need work.
  const url = `${SUPABASE_URL}/rest/v1/parking_logs?select=id,latitude,longitude,street_address&house_number=is.null&order=created_at.asc`;
  const res  = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`Failed to fetch rows: ${res.status} ${await res.text()}`);
  return res.json();
}

async function updateRow(id, houseNumber, displayAddress) {
  const url  = `${SUPABASE_URL}/rest/v1/parking_logs?id=eq.${id}`;
  const body = JSON.stringify({ house_number: houseNumber || null, display_address: displayAddress });
  const res  = await fetch(url, { method: "PATCH", headers: HEADERS, body });
  if (!res.ok) throw new Error(`Failed to update row ${id}: ${res.status} ${await res.text()}`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

const rows = await fetchRows();
console.log(`Found ${rows.length} row(s) to backfill.\n`);

if (rows.length === 0) {
  console.log("Nothing to do.");
  process.exit(0);
}

let ok = 0, skipped = 0, failed = 0;

for (const row of rows) {
  const { id, latitude, longitude, street_address } = row;
  process.stdout.write(`  Row ${id.slice(0, 8)}…  lat=${latitude} lng=${longitude}  `);

  try {
    const { houseNumber, streetName } = await reverseGeocode(latitude, longitude);

    const name    = streetName || street_address;
    const display = houseNumber ? `${houseNumber} ${name}` : name;

    await updateRow(id, houseNumber, display);
    process.stdout.write(`→ "${display}"\n`);
    ok++;
  } catch (err) {
    process.stdout.write(`ERROR: ${err.message}\n`);
    failed++;
  }

  // Nominatim rate limit: 1 request per second
  await sleep(1100);
}

console.log(`\nDone. Updated: ${ok}  Skipped: ${skipped}  Failed: ${failed}`);
