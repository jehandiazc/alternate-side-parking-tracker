-- Add display_address column to parking_logs.
--
-- street_address  → road name only, e.g. "West 84th Street"
--                   used for NYC DOT API queries (must not include house number)
--
-- display_address → full human-readable address, e.g. "155 West 84th Street"
--                   shown to users so they can find the exact car location
--                   also used to identify the block segment for schedule lookup
--
-- Existing rows get display_address = street_address (no house number available).
alter table parking_logs
  add column display_address text not null default '';

update parking_logs
  set display_address = street_address
  where display_address = '';

-- Remove the default so future inserts must supply a value explicitly
alter table parking_logs
  alter column display_address drop default;
