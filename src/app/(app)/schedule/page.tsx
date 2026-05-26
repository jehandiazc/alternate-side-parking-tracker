// Phase 1: Weekly cleaning schedule view
// TODO: Pull schedule for the car's current street from NYC Open Data

export default function SchedulePage() {
  return (
    <div className="px-4 pt-12 pb-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-extrabold text-[--color-text-primary]">Schedule</h1>
      <p className="text-sm text-[--color-text-secondary] mt-1">
        Street cleaning days for your block, including holiday suspensions.
      </p>
      <div className="mt-8 rounded-[var(--radius-lg)] bg-[--color-surface-raised] border border-[--color-border] h-64 flex items-center justify-center">
        <p className="text-[--color-text-muted] text-sm">Schedule coming in Phase 1</p>
      </div>
    </div>
  );
}
