import crypto from "node:crypto";
import webpush from "web-push";
import { sanityClient } from "./sanity.js";

const publicKey = (process.env.VAPID_PUBLIC_KEY || "").trim();
const privateKey = (process.env.VAPID_PRIVATE_KEY || "").trim();
const subject = (process.env.VAPID_SUBJECT || "").trim();
const pushSecret = (process.env.PUSH_SECRET || "").trim();

// Throw early rather than silently accepting subscriptions we can never use,
// matching how sanity.js guards its write token.
if (!publicKey || !privateKey || !subject) {
  throw new Error(
    "Missing VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT environment variables.",
  );
}

if (!pushSecret) {
  throw new Error("Missing PUSH_SECRET environment variable.");
}

webpush.setVapidDetails(subject, publicKey, privateKey);

// The Sanity dataset is world-readable, and a push subscription is a bearer
// credential: anyone holding it can send notifications to that device. So the
// whole subscription is sealed and only the tick endpoint can open it.
const sealKey = crypto.createHash("sha256").update(pushSecret).digest();

function seal(value) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", sealKey, iv);
  const body = Buffer.concat([
    cipher.update(JSON.stringify(value), "utf8"),
    cipher.final(),
  ]);
  return Buffer.concat([iv, cipher.getAuthTag(), body]).toString("base64");
}

function unseal(blob) {
  const raw = Buffer.from(blob, "base64");
  const decipher = crypto.createDecipheriv("aes-256-gcm", sealKey, raw.subarray(0, 12));
  decipher.setAuthTag(raw.subarray(12, 28));
  return JSON.parse(
    Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString(
      "utf8",
    ),
  );
}

// Deterministic id so re-subscribing the same device overwrites instead of
// piling up duplicates.
function subscriptionId(endpoint) {
  return `push-${crypto.createHash("sha256").update(endpoint).digest("hex").slice(0, 32)}`;
}

export function isValidSubscription(subscription) {
  return Boolean(
    subscription &&
      typeof subscription.endpoint === "string" &&
      subscription.endpoint.startsWith("https://") &&
      subscription.keys &&
      typeof subscription.keys.p256dh === "string" &&
      typeof subscription.keys.auth === "string",
  );
}

export async function saveSubscription(subscription, tzOffset) {
  const document = {
    _id: subscriptionId(subscription.endpoint),
    _type: "pushSubscription",
    blob: seal(subscription),
    // Kept in the clear so the tick can filter by local hour without opening
    // every blob. On its own it identifies nobody.
    tzOffset,
  };

  await sanityClient.createOrReplace(document);
}

export async function deleteSubscription(endpoint) {
  await sanityClient.delete(subscriptionId(endpoint));
}

export function isSecretValid(candidate) {
  const expected = Buffer.from(pushSecret);
  const given = Buffer.from(String(candidate || ""));
  return (
    expected.length === given.length && crypto.timingSafeEqual(expected, given)
  );
}

// Mirrors REMINDER_HOUR in src/utils/reminderCore.ts. The worker re-checks the
// time anyway, so a drift here only means a wasted knock, never a wrong verse.
const REMINDER_HOUR = 9;

function localHour(now, tzOffset) {
  const minutes = now.getUTCHours() * 60 + now.getUTCMinutes() - tzOffset;
  return Math.floor(((minutes % 1440) + 1440) % 1440 / 60);
}

// The push carries no payload: the service worker already knows every user's
// verses from IndexedDB and decides what (if anything) is actually due. The
// server only knocks, so no verse or personal data ever reaches it.
// force skips the hour check and asks the worker for a visible test
// notification, so delivery can be proven at any time of day instead of only
// at 9am. Guarded by the same secret as the tick itself.
export async function sendDueKnocks(now = new Date(), force = false) {
  const stored = await sanityClient.fetch(
    `*[_type == "pushSubscription"]{_id, blob, tzOffset}`,
  );

  const targets = force
    ? stored
    : stored.filter(
        (row) => localHour(now, row.tzOffset ?? 0) === REMINDER_HOUR,
      );

  const results = await Promise.allSettled(
    targets.map(async (row) => {
      try {
        await webpush.sendNotification(unseal(row.blob), force ? "test" : "");
      } catch (error) {
        // 404/410 mean the browser dropped the subscription for good.
        if (error?.statusCode === 404 || error?.statusCode === 410) {
          await sanityClient.delete(row._id);
          return "gone";
        }
        throw error;
      }
      return "sent";
    }),
  );

  return {
    total: stored.length,
    matched: targets.length,
    sent: results.filter((r) => r.status === "fulfilled" && r.value === "sent")
      .length,
    dropped: results.filter((r) => r.status === "fulfilled" && r.value === "gone")
      .length,
    failed: results.filter((r) => r.status === "rejected").length,
  };
}
