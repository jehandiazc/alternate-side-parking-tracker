"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { StreetSide } from "@/types";

interface StreetSidePickerProps {
  value: StreetSide | null;
  onChange: (side: StreetSide) => void;
  /** True while the parent is computing the auto-detected side */
  autoDetecting?: boolean;
}

const SIDE_META: Record<StreetSide, { label: string; arrow: string }> = {
  N: { label: "North side", arrow: "↑" },
  S: { label: "South side", arrow: "↓" },
  E: { label: "East side",  arrow: "→" },
  W: { label: "West side",  arrow: "←" },
};

const ALL_SIDES: StreetSide[] = ["N", "S", "E", "W"];

export function StreetSidePicker({
  value,
  onChange,
  autoDetecting = false,
}: StreetSidePickerProps) {
  const [expanded, setExpanded] = useState(false);

  if (autoDetecting) {
    return (
      <div className="w-full space-y-2">
        <p className="text-xs font-semibold text-[--color-text-secondary] uppercase tracking-wide">
          Which side of the street?
        </p>
        <div
          className="rounded-[var(--radius-lg)] px-4 py-3 flex items-center gap-2"
          style={{ background: "var(--color-surface-raised)", border: "1px solid var(--color-border)" }}
        >
          <div className="w-3 h-3 rounded-full border-2 border-[--color-primary] border-t-transparent animate-spin flex-shrink-0" />
          <p className="text-sm text-[--color-text-secondary]">Detecting from map…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-[--color-text-secondary] uppercase tracking-wide">
          Which side of the street?
        </p>
        {value && !expanded && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="text-[10px] font-semibold text-[--color-primary] uppercase tracking-wide hover:underline"
          >
            Change
          </button>
        )}
      </div>

      {!expanded && value ? (
        // ── Confirmed state: show selected side prominently ────────────────
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="w-full flex items-center justify-between rounded-[var(--radius-lg)] px-4 py-3 transition-colors"
          style={{
            background: "var(--color-primary)",
            border: "1px solid var(--color-primary)",
          }}
        >
          <div className="flex items-center gap-3">
            <span className="text-xl text-white">{SIDE_META[value].arrow}</span>
            <span className="text-sm font-bold text-white">{SIDE_META[value].label}</span>
          </div>
          <span className="text-[11px] font-semibold text-white/60 uppercase tracking-wide">
            Tap to change
          </span>
        </button>
      ) : (
        // ── Picker: all four options ───────────────────────────────────────
        <div className="grid grid-cols-2 gap-2">
          {ALL_SIDES.map((side) => {
            const { label, arrow } = SIDE_META[side];
            const isActive = value === side;
            return (
              <button
                key={side}
                type="button"
                onClick={() => {
                  onChange(side);
                  setExpanded(false);
                }}
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
      )}

      {/* Map orientation hint — always shown so users can orient themselves */}
      <p className="text-[10px] text-center text-[--color-text-muted]">
        North is the top of the map above
      </p>
    </div>
  );
}
