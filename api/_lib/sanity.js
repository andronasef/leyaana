import { createClient } from "@sanity/client";
import dotenv from "dotenv";

dotenv.config();

const projectId = process.env.SANITY_PROJECT_ID || "kfme7y2v";
const dataset = process.env.SANITY_DATASET || "production";
const apiVersion = process.env.SANITY_API_VERSION || "2024-01-01";
const token = (
  process.env.SANITY_WRITE_TOKEN ||
  process.env.SANITY_TOKEN ||
  ""
).trim();

if (!token) {
  // Throw early to avoid silently accepting writes without auth.
  throw new Error(
    "Missing SANITY_WRITE_TOKEN (or SANITY_TOKEN) environment variable.",
  );
}

export const sanityClient = createClient({
  projectId,
  dataset,
  apiVersion,
  token,
  useCdn: false,
});

export const contentTypeFields = {
  verse: ["title", "verse", "order"],
  godName: ["name", "mean", "content", "order"],
  heavenlyBlessing: ["name", "mean", "content", "order"],
};

export function isAllowedType(type) {
  return Object.hasOwn(contentTypeFields, type);
}

export function sanitizePayload(type, data) {
  const allowedFields = contentTypeFields[type];
  const clean = {};

  for (const field of allowedFields) {
    if (Object.hasOwn(data, field)) {
      clean[field] = data[field];
    }
  }

  if (Object.hasOwn(clean, "order") && typeof clean.order !== "number") {
    const parsed = Number(clean.order);
    clean.order = Number.isNaN(parsed) ? 0 : parsed;
  }

  if (type === "verse" && typeof clean.verse === "string") {
    clean.verse = clean.verse.trim();
  }

  if (Object.hasOwn(clean, "name") && typeof clean.name === "string") {
    clean.name = clean.name.trim();
  }

  return clean;
}

export function badRequest(res, message) {
  return res.status(400).json({ ok: false, error: message });
}

export function methodNotAllowed(res, methods) {
  const allow = Array.isArray(methods)
    ? methods
    : ["OPTIONS", "POST", "PATCH", "DELETE"];
  res.setHeader("Allow", allow.join(", "));
  return res.status(405).json({ ok: false, error: "Method not allowed" });
}
