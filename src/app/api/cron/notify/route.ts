import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendPushNotification } from "@/lib/web-push";

// ─── Auth helper ─────────────────────────────────────────────────────────────

function isAuthorized(req: NextRequest): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false; // misconfigured — fail safe

  // Vercel passes the secret as: Authorization: Bearer <CRON_SECRET>
  const authHeader = req.headers.get("authorization") ?? "";
  return authHeader === `Bearer ${expected}`;
}

// ─── Supabase service-role client (bypasses RLS) ─────────────────────────────

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// ─── Time helpers ─────────────────────────────────────────────────────────────

const NYC_TZ = "America/New_York";

/** Return the current time as a Date (NYC-aware) */
function nowNYC(): Date {
  return new Date();
}

/** Return true if the given UTC Date falls on "tomorrow" in NYC */
function isTomorrowInNYC(date: Date): boolean {
  const nycFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: NYC_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const todayNYC = nycFormatter.format(new Date());
  const dateNYC = nycFormatter.format(date);

  const toDate = (str: string) => {
    const [month, day, year] = str.split("/");
    return new Date(`${year}-${month}-${day}`);
  };

  const today = toDate(todayNYC);
  const target = toDate(dateNYC);

  const diffMs = target.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  return diffDays === 1;
}

/** Return the current hour (0-23) in NYC */
function currentHourNYC(): number {
  return Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: NYC_TZ,
      hour: "numeric",
      hour12: false,
    }).format(new Date())
  );
}

/** Return the current minute (0-59) in NYC */
function currentMinuteNYC(): number {
  return Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: NYC_TZ,
      minute: "numeric",
    }).format(new Date())
  );
}

/** Format a Date as a human-readable time string in NYC (e.g. "8:30 AM") */
function formatTimeNYC(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: NYC_TZ,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getServiceClient();
  const now = nowNYC();
  let sent = 0;
  const errors: string[] = [];

  // ── Window 1: Two hours before ───────────────────────────────────────────
  // next_move_at is between 115 and 135 minutes from now (±10 min around 2h)
  const twoHoursWindowStart = new Date(now.getTime() + 115 * 60 * 1000);
  const twoHoursWindowEnd = new Date(now.getTime() + 135 * 60 * 1000);

  const { data: twoHourLogs, error: twoHourError } = await supabase
    .from("parking_logs")
    .select(`
      id,
      car_id,
      next_move_at,
      cars ( name )
    `)
    .eq("is_active", true)
    .eq("notified_two_hours", false)
    .gte("next_move_at", twoHoursWindowStart.toISOString())
    .lte("next_move_at", twoHoursWindowEnd.toISOString());

  if (twoHourError) {
    errors.push(`two-hour query: ${twoHourError.message}`);
  } else if (twoHourLogs) {
    for (const log of twoHourLogs) {
      const carName = (log.cars as unknown as { name: string } | null)?.name ?? "Your car";
      const moveTime = formatTimeNYC(new Date(log.next_move_at));
      const payload = {
        title: "⏰ Move in 2 hours",
        body: `${carName} needs to move by ${moveTime}.`,
        tag: `two-hours-${log.car_id}`,
        url: "/",
      };
      const count = await notifyCarSubscribers(
        supabase,
        log.car_id,
        "notify_two_hours_before",
        payload,
        errors
      );
      sent += count;

      if (count > 0) {
        await supabase
          .from("parking_logs")
          .update({ notified_two_hours: true })
          .eq("id", log.id);
      }
    }
  }

  // ── Window 2: Night before (8 PM NYC, ±7.5 min = 20:00–20:15) ───────────
  const hour = currentHourNYC();
  const minute = currentMinuteNYC();
  const isNightBeforeWindow = hour === 20 && minute < 15;

  if (isNightBeforeWindow) {
    const { data: nightLogs, error: nightError } = await supabase
      .from("parking_logs")
      .select(`
        id,
        car_id,
        next_move_at,
        cars ( name )
      `)
      .eq("is_active", true)
      .eq("notified_night_before", false)
      .not("next_move_at", "is", null);

    if (nightError) {
      errors.push(`night-before query: ${nightError.message}`);
    } else if (nightLogs) {
      // Filter to logs where next_move_at is tomorrow in NYC
      const tomorrowLogs = nightLogs.filter(
        (log) => log.next_move_at && isTomorrowInNYC(new Date(log.next_move_at))
      );

      for (const log of tomorrowLogs) {
        const carName = (log.cars as unknown as { name: string } | null)?.name ?? "Your car";
        const moveTime = formatTimeNYC(new Date(log.next_move_at));
        const payload = {
          title: "🚗 Move tomorrow",
          body: `Move ${carName} by ${moveTime} tomorrow.`,
          tag: `night-before-${log.car_id}`,
          url: "/",
        };
        const count = await notifyCarSubscribers(
          supabase,
          log.car_id,
          "notify_night_before",
          payload,
          errors
        );
        sent += count;

        if (count > 0) {
          await supabase
            .from("parking_logs")
            .update({ notified_night_before: true })
            .eq("id", log.id);
        }
      }
    }
  }

  return NextResponse.json({ ok: true, sent, errors });
}

// ─── Helper: notify all subscribers of a car ─────────────────────────────────

async function notifyCarSubscribers(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  carId: string,
  notifyPrefColumn: "notify_night_before" | "notify_two_hours_before",
  payload: { title: string; body: string; tag: string; url: string },
  errors: string[]
): Promise<number> {
  // Get subscribers who have this notification type enabled
  const { data: subs, error: subsError } = await supabase
    .from("car_subscriptions")
    .select("user_id")
    .eq("car_id", carId)
    .eq(notifyPrefColumn, true);

  if (subsError || !subs?.length) return 0;

  const userIds = subs.map((s: { user_id: string }) => s.user_id);

  // Get their push subscriptions
  const { data: pushSubs, error: pushError } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .in("user_id", userIds);

  if (pushError || !pushSubs?.length) return 0;

  let sent = 0;
  const expiredIds: string[] = [];

  for (const sub of pushSubs) {
    try {
      await sendPushNotification(
        { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
        payload
      );
      sent++;
    } catch (err: unknown) {
      // 404/410 means the subscription has expired — clean it up
      const status =
        err && typeof err === "object" && "statusCode" in err
          ? (err as { statusCode: number }).statusCode
          : null;

      if (status === 404 || status === 410) {
        expiredIds.push(sub.id);
      } else {
        errors.push(`push to ${sub.endpoint.slice(-20)}: ${String(err)}`);
      }
    }
  }

  // Remove expired subscriptions
  if (expiredIds.length > 0) {
    await supabase.from("push_subscriptions").delete().in("id", expiredIds);
  }

  return sent;
}
