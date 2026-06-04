-- ─────────────────────────────────────────────────────────────────────────────
-- Add descriptive vehicle details to cars
-- ─────────────────────────────────────────────────────────────────────────────
-- All optional. Surfaced in the UI (tap the map marker on the dashboard, edit on
-- the Crew tab) so a crew can tell which/whose car they're looking at.
-- No RLS changes needed: the existing "Creator can update their car" policy
-- already governs who may set these, and "Subscribers can view a car" governs
-- who may read them.

alter table cars
  add column make  text,
  add column model text,
  add column color text;
