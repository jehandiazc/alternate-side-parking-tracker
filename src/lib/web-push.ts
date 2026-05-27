import webpush from "web-push";

// Configure once at module load — safe for server-side use in Next.js API routes
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export interface PushPayload {
  title: string;
  body: string;
  /** Collapses duplicate notifications in the OS notification tray */
  tag?: string;
  /** Deep-link URL opened when the user taps the notification */
  url?: string;
}

export interface PushTarget {
  endpoint: string;
  p256dh: string;
  auth: string;
}

/**
 * Send a Web Push notification to a single subscription.
 *
 * Throws if the push service returns a non-2xx response — callers should
 * catch 404/410 (subscription expired) and remove it from the DB.
 */
export async function sendPushNotification(
  target: PushTarget,
  payload: PushPayload
): Promise<void> {
  await webpush.sendNotification(
    {
      endpoint: target.endpoint,
      keys: { p256dh: target.p256dh, auth: target.auth },
    },
    JSON.stringify(payload)
  );
}
