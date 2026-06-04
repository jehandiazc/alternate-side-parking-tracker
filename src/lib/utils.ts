import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatDistanceToNow, format, isToday, isTomorrow } from "date-fns";

// Merge Tailwind classes safely (handles conflicts)
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format a move deadline in a human-friendly way
// e.g. "Today at 8:30 AM", "Tomorrow at 11:00 AM", "Wednesday at 8:30 AM"
export function formatMoveTime(date: Date): string {
  const time = format(date, "h:mm a");
  if (isToday(date)) return `Today at ${time}`;
  if (isTomorrow(date)) return `Tomorrow at ${time}`;
  return `${format(date, "EEEE")} at ${time}`;
}

// "in 14 hours", "in 2 hours", "in 45 minutes"
export function formatCountdown(date: Date): string {
  return formatDistanceToNow(date, { addSuffix: true });
}

// Borough codes used in NYC Open Data
export const BOROUGH_CODES: Record<string, string> = {
  manhattan: "1",
  bronx: "2",
  brooklyn: "3",
  queens: "4",
  "staten island": "5",
};

// Opposite street side — useful for "parking across the street" logic
export function oppositeSide(side: "N" | "S" | "E" | "W"): "N" | "S" | "E" | "W" {
  const map = { N: "S", S: "N", E: "W", W: "E" } as const;
  return map[side];
}
