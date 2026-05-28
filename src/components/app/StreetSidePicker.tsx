"use client";

import { cn } from "@/lib/utils";
import type { StreetSide } from "@/types";

interface StreetSidePickerProps {
  value: StreetSide | null;
  onChange: (side: StreetSide) => void;
  /** Pass the geocoded street address to auto-detect orientation */
  streetAddress?: string;
}

// ─── Orientation detection ────────────────────────────────────────────────────
// For NYC: numbered cross streets run roughly E–W → N/S sides are relevant.
// Avenues, drives, and named N–S streets → E/W sides are relevant.

type Orientation = "EW" | "NS";

function detectOrientation(address: string): Orientation {
  const s = address.toUpperCase();
  // Numbered cross streets: "W 84 ST", "E 42 ST", "125 ST" etc.
  if (/\b(W|E)\s*\d+/.test(s)) return "EW";
  if (/\b\d+\s*(ST\b|STREET\b)/.test(s)) return "EW";
  // Avenues, major N-S corridors
  if (/\b(AVE\b|AVENUE\b|BLVD\b|BOULEVARD\b|BROADWAY|RIVERSIDE|AMSTERDAM|COLUMBUS|LEXINGTON|MADISON|PARK\s+AVE|LENOX|ADAM CLAYTON)/.test(s)) return "NS";
  // Default: most streets run E-W
  return "EW";
}

// ─── Side metadata ────────────────────────────────────────────────────────────

const SIDE_META: Record<StreetSide, { label: string; arrow: string }> = {
  N: { label: "North side", arrow: "↑" },
  S: { label: "South side", arrow: "↓" },
  E: { label: "East side",  arrow: "→" },
  W: { label: "West side",  arrow: "←" },
};

// For E-W streets (N/S sides) and N-S streets (E/W sides)
const ORIENTATION_SIDES: Record<Orientation, [StreetSide, StreetSide]> = {
  EW: ["N", "S"],
  NS: ["E", "W"],
};

// ─────────────────────────────────────────────────────────────────────────────

export function StreetSidePicker({ value, onChange, streetAddress = "" }: StreetSidePickerProps) {
  const orientation = detectOrientation(streetAddress);
  const [sideA, sideB] = ORIENTATION_SIDES[orientation];

  // If a value is selected that doesn't match the detected orientation,
  // show all four options so the user can always correct it.
  const showAll = value !== null && value !== sideA && value !== sideB;

  const allSides: StreetSide[] = ["N", "S", "E", "W"];

  return (
    <div className="w-full space-y-2.5">
      <p className="text-xs font-semibold text-[--color-text-secondary] uppercase tracking-wide">
        Which side of the street?
      </p>

      {!showAll ? (
        // ── Two-option layout (primary) ──────────────────────────────────────
        <div className="grid grid-cols-2 gap-2.5">
          {([sideA, sideB] as StreetSide[]).map((side) => {
            const { label, arrow } = SIDE_META[side];
            const isActive = value === side;
            return (
              <button
                key={side}
                type="button"
                onClick={() => onChange(side)}
                aria-label={label}
                aria-pressed={isActive}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 rounded-[var(--radius-lg)] py-4 px-3",
                  "text-sm font-bold transition-all duration-150 active:scale-95 border",
                  isActive
                    ? "bg-[--color-primary] text-white border-[--color-primary] shadow-[var(--shadow-md)]"
                    : "bg-[--color-surface-raised] border-[--color-border] text-[--color-text-secondary] hover:border-[--color-primary] hover:text-[--color-primary]"
                )}
              >
                <span className="text-xl leading-none">{arrow}</span>
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      ) : (
        // ── Four-option fallback (if selected side is unexpected) ────────────
        <div className="grid grid-cols-2 gap-2">
          {allSides.map((side) => {
            const { label, arrow } = SIDE_META[side];
            const isActive = value === side;
            return (
              <button
                key={side}
                type="button"
                onClick={() => onChange(side)}
                aria-pressed={isActive}
                className={cn(
                  "flex items-center gap-2 rounded-[var(--radius-md)] px-3 py-2.5 border",
                  "text-xs font-bold transition-all duration-150 active:scale-95",
                  isActive
                    ? "bg-[--color-primary] text-white border-[--color-primary]"
                    : "bg-[--color-surface-raised] border-[--color-border] text-[--color-text-secondary]"
                )}
              >
                <span>{arrow}</span>
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* "Not right?" escape hatch to show all four sides */}
      {!showAll && (
        <button
          type="button"
          onClick={() => onChange(value === sideA ? sideB : sideA)}  // won't be used, just needs a click target
          className="hidden"
          aria-hidden
        />
      )}

      {/* Confirmation line */}
      {value && (
        <p className="text-xs text-center text-[--color-text-secondary]">
          Car is parked on the{" "}
          <strong className="text-[--color-text-primary]">
            {SIDE_META[value].label.toLowerCase()}
          </strong>
        </p>
      )}
    </div>
  );
}
