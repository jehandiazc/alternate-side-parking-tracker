-- Add house_number column to parking_logs.
--
-- Stores the building/lot number from Nominatim reverse geocoding, e.g. "155".
-- Used to construct display_address and to identify the precise block segment
-- when filtering NYC DOT street cleaning sign data.
--
-- Nullable: some locations (parks, mid-block lots) have no house number.
-- Old rows are backfilled via scripts/backfill-house-numbers.ts using lat/lng.
alter table parking_logs
  add column house_number text;
