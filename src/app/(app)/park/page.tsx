// Phase 1: Log parking location
// TODO: GPS pin drop, street side selector, submit → create ParkingLog in Supabase

export default function ParkPage() {
  return (
    <div className="px-4 pt-12 pb-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-extrabold text-[--color-text-primary]">Log Parking</h1>
      <p className="text-sm text-[--color-text-secondary] mt-1">
        Drop a pin where you parked and select the street side.
      </p>
      <div className="mt-8 rounded-[var(--radius-lg)] bg-[--color-surface-raised] border border-[--color-border] h-64 flex items-center justify-center">
        <p className="text-[--color-text-muted] text-sm">Map coming in Phase 1</p>
      </div>
    </div>
  );
}
