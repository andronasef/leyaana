import { badRequest, methodNotAllowed } from "./_lib/sanity.js";
import {
  deleteSubscription,
  isSecretValid,
  isValidSubscription,
  saveSubscription,
  sendDueKnocks,
} from "./_lib/push.js";

const allowedMethods = ["GET", "POST", "DELETE"];

function parseBody(req) {
  if (!req.body) return {};
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return req.body;
}

// GET is the cron tick. Any free scheduler (cron-job.org, UptimeRobot, GitHub
// Actions) can hit it hourly; the secret is what keeps strangers from spamming
// everyone's devices.
async function tick(req, res) {
  const secret =
    req.query?.secret ||
    (req.headers.authorization || "").replace(/^Bearer\s+/i, "");

  if (!isSecretValid(secret)) {
    return res.status(401).json({ ok: false, error: "Unauthorized." });
  }

  return res.status(200).json({ ok: true, ...(await sendDueKnocks()) });
}

async function subscribe(req, res) {
  const { subscription, tzOffset } = parseBody(req);

  if (!isValidSubscription(subscription)) {
    return badRequest(res, "Invalid push subscription.");
  }

  const offset = Number(tzOffset);
  if (!Number.isFinite(offset) || Math.abs(offset) > 900) {
    return badRequest(res, "Invalid timezone offset.");
  }

  await saveSubscription(subscription, offset);

  return res.status(200).json({ ok: true });
}

async function unsubscribe(req, res) {
  const { endpoint } = parseBody(req);

  if (typeof endpoint !== "string" || !endpoint.startsWith("https://")) {
    return badRequest(res, "Invalid push endpoint.");
  }

  await deleteSubscription(endpoint);

  return res.status(200).json({ ok: true });
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Methods", allowedMethods.join(", "));
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  try {
    if (req.method === "GET") return await tick(req, res);
    if (req.method === "POST") return await subscribe(req, res);
    if (req.method === "DELETE") return await unsubscribe(req, res);

    return methodNotAllowed(res, allowedMethods);
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: "Unexpected server error.",
      details: error.message,
    });
  }
}
