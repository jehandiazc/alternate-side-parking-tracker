// Phase 2: Car subscribers — who's watching this car, notification prefs, invite link
// TODO: Wire up Supabase subscriptions table

export default function CrewPage() {
  return (
    <div className="px-4 pt-12 pb-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-extrabold text-[--color-text-primary]">The Crew</h1>
      <p className="text-sm text-[--color-text-secondary] mt-1">
        Everyone subscribed to this car.
      </p>
      <div className="mt-8 rounded-[var(--radius-lg)] bg-[--color-surface-raised] border border-[--color-border] h-64 flex items-center justify-center">
        <p className="text-[--color-text-muted] text-sm">Crew management coming in Phase 2</p>
      </div>
    </div>
  );
}
