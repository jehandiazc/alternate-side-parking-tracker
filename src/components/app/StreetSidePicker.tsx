"use client";

import { cn } from "@/lib/utils";
import type { StreetSide } from "@/types";

interface StreetSidePickerProps {
  value: StreetSide | null;
  onChange: (side: StreetSide) => void;
}

// Visual compass grid: N on top, S on bottom, W left, E right
// Tapping a side highlights it and shows which side of the street the car is on.

const SIDES: { side: StreetSide; label: string; gridArea: string }[] = [
  { side: "N", label: "North", gridArea: "n" },
  { side: "S", label: "South", gridArea: "s" },
  { side: "W", label: "West",  gridArea: "w" },
  { side: "E", label: "East",  gridArea: "e" },
];

export function StreetSidePicker({ value, onChange }: StreetSidePickerProps) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-[--color-text-secondary] uppercase tracking-wide">
        Which side of the street?
      </p>

      {/*
        Compass grid:
              [N]
          [W] [·] [E]
              [S]
      */}
      <div
        className="relative mx-auto"
        style={{
          display: "grid",
          gridTemplateAreas: `
            ". n ."
            "w c e"
            ". s ."
          `,
          gridTemplateColumns: "1fr 1fr 1fr",
          gridTemplateRows: "1fr 1fr 1fr",
          gap: "6px",
          width: "160px",
          height: "160px",
        }}
      >
        {SIDES.map(({ side, label, gridArea }) => {
          const isActive = value === side;
          return (
            <button
              key={side}
              type="button"
              onClick={() => onChange(side)}
              aria-label={`${label} side`}
              aria-pressed={isActive}
              style={{ gridArea }}
              className={cn(
                "flex flex-col items-center justify-center rounded-[var(--radius-md)]",
                "text-xs font-bold transition-all duration-150 active:scale-95",
                isActive
                  ? "bg-[--color-primary] text-white shadow-[var(--shadow-md)]"
                  : "bg-[--color-surface-raised] border border-[--color-border] text-[--color-text-secondary] hover:border-[--color-primary] hover:text-[--color-primary]"
              )}
            >
              <span className="text-base leading-none mb-0.5">
                {side === "N" ? "↑" : side === "S" ? "↓" : side === "W" ? "←" : "→"}
              </span>
              {side}
            </button>
          );
        })}

        {/* Centre dot */}
        <div
          style={{ gridArea: "c" }}
          className="flex items-center justify-center"
        >
          <div className="w-2 h-2 rounded-full bg-[--color-border]" />
        </div>
      </div>

      {value && (
        <p className="text-xs text-center text-[--color-text-secondary]">
          Car is on the{" "}
          <strong className="text-[--color-text-primary]">
            {value === "N" ? "north" : value === "S" ? "south" : value === "W" ? "west" : "east"}
          </strong>{" "}
          side of the street
        </p>
      )}
    </div>
  );
}
