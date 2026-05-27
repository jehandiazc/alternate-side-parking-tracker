// ─────────────────────────────────────────────
// Core domain types for ParkShare
// ─────────────────────────────────────────────

export type StreetSide = "N" | "S" | "E" | "W";

export interface Car {
  id: string;
  name: string;          // e.g. "The Civic", "The Beast"
  license_plate?: string;
  created_by: string;    // user id
  created_at: string;
  invite_code: string;
}

export interface ParkingLog {
  id: string;
  car_id: string;
  logged_by: string;     // user id
  latitude: number;
  longitude: number;
  street_address: string;
  street_side: StreetSide;
  next_move_at: string;  // ISO timestamp — when the car must be moved
  is_active: boolean;    // false once superseded by a new log
  created_at: string;
}

export interface Profile {
  id: string;
  email: string;
  display_name?: string;
  avatar_url?: string;
  created_at: string;
}

export interface CarSubscription {
  id: string;
  car_id: string;
  user_id: string;
  notify_night_before: boolean;     // 8 PM the night before
  notify_two_hours_before: boolean; // 2 hours before move
  notify_morning_of: boolean;       // 7 AM same day
  created_at: string;
  profile?: Profile;
}

export interface PushSubscription {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  created_at: string;
}

// NYC Open Data — street cleaning schedule entry
export interface CleaningSchedule {
  streetName: string;
  fromStreet: string;
  toStreet: string;
  side: StreetSide;
  day: string;           // "Monday", "Tuesday", etc.
  startHour: number;     // 8 = 8:00 AM
  endHour: number;       // 9 = 9:00 AM (exclusive — move by 8:30 AM usually)
  borough: string;
}

// 311 suspension entry
export interface SuspensionDay {
  date: string;          // YYYY-MM-DD
  reason: string;        // e.g. "Thanksgiving Day"
}

// Enriched status — what the dashboard renders
export type ParkingStatus =
  | { type: "parked"; log: ParkingLog; moveAt: Date; isSuspended: false }
  | { type: "parked"; log: ParkingLog; moveAt: Date; isSuspended: true; suspensionReason: string }
  | { type: "unknown" };  // car location not yet logged
