import webpush from "web-push";

// Lazily configured on first call — avoids build-time errors when VAPID env
// vars are absent (e.g. during `next build` on CI without secrets).
let _configured = false;
function ensureConfigured() {
  if (_configured) return;
  const subject   = process.env.VAPID_SUBJECT;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!subject || !publicKey || !privateKey) {
    throw new Error("VAPID env vars (VAPID_SUBJECT, NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY) are not set.");
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
  _configured = true;
}

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
  ensureConfigured();
  await webpush.sendNotification(
    {
      endpoint: target.endpoint,
      keys: { p256dh: target.p256dh, auth: target.auth },
    },
    JSON.stringify(payload)
  );
}
