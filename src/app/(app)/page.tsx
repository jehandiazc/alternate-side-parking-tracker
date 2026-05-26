import { StatusCard } from "@/components/app/StatusCard";
import { Button } from "@/components/ui/Button";
import { MapPin, Bell } from "lucide-react";
import Link from "next/link";
import type { ParkingStatus } from "@/types";

// TODO: Replace with real data from Supabase once auth + DB are wired up
const MOCK_CAR_NAME = "The Civic";
const MOCK_STATUS: ParkingStatus = {
  type: "parked",
  log: {
    id: "1",
    car_id: "1",
    logged_by: "1",
    latitude: 40.7831,
    longitude: -73.9712,
    street_address: "W 84th St",
    street_side: "N",
    next_move_at: new Date(Date.now() + 1000 * 60 * 60 * 14).toISOString(),
    is_active: true,
    created_at: new Date().toISOString(),
  },
  moveAt: new Date(Date.now() + 1000 * 60 * 60 * 14),
  isSuspended: false,
};

export default function DashboardPage() {
  return (
    <div className="px-4 pt-12 pb-6 max-w-lg mx-auto space-y-4">

      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs font-semibold text-[--color-text-muted] uppercase tracking-widest">
            Good morning
          </p>
          <h1 className="text-2xl font-extrabold text-[--color-text-primary] leading-tight">
            ParkShare
          </h1>
        </div>
        <button
          aria-label="Notification settings"
          className="w-10 h-10 rounded-full bg-[--color-surface] border border-[--color-border] flex items-center justify-center shadow-[var(--shadow-sm)] text-[--color-text-secondary] hover:text-[--color-primary] transition-colors"
        >
          <Bell size={18} />
        </button>
      </div>

      {/* Main status card */}
      <StatusCard carName={MOCK_CAR_NAME} status={MOCK_STATUS} />

      {/* Primary CTA */}
      <Button variant="cta" size="xl" className="w-full" asChild>
        <Link href="/park">
          <MapPin size={20} />
          I Just Parked
        </Link>
      </Button>

      {/* Upcoming week teaser — placeholder */}
      <div className="pt-2">
        <p className="text-xs font-semibold text-[--color-text-muted] uppercase tracking-widest mb-3">
          This Week
        </p>
        <div className="grid grid-cols-7 gap-1">
          {["M", "T", "W", "T", "F", "S", "S"].map((day, i) => (
            <div
              key={i}
              className="flex flex-col items-center gap-1.5 py-2.5 rounded-[var(--radius-md)] bg-[--color-surface] border border-[--color-border]"
            >
              <span className="text-[10px] font-semibold text-[--color-text-muted]">
                {day}
              </span>
              <span
                className={`w-2 h-2 rounded-full ${
                  i === 1 || i === 3
                    ? "bg-[--color-accent]"         // cleaning day
                    : i === 5
                    ? "bg-[--color-success]"         // holiday/suspension
                    : "bg-[--color-border]"          // no cleaning
                }`}
              />
            </div>
          ))}
        </div>
        <div className="flex gap-4 mt-2 px-1">
          <span className="flex items-center gap-1.5 text-[11px] text-[--color-text-muted]">
            <span className="w-2 h-2 rounded-full bg-[--color-accent] inline-block" />
            Cleaning day
          </span>
          <span className="flex items-center gap-1.5 text-[11px] text-[--color-text-muted]">
            <span className="w-2 h-2 rounded-full bg-[--color-success] inline-block" />
            Suspended
          </span>
        </div>
      </div>

    </div>
  );
}
