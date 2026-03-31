import {
  badRequest,
  isAllowedType,
  methodNotAllowed,
  sanitizePayload,
  sanityClient,
} from "./_lib/sanity.js";

const allowedMethods = ["OPTIONS", "POST", "PATCH", "DELETE"];

function withCors(res) {
  res.setHeader("Access-Control-Allow-Methods", allowedMethods.join(", "));
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function parseBody(req) {
  if (!req.body) {
    return {};
  }

  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }

  return req.body;
}

async function createContent(req, res) {
  const body = parseBody(req);
  const { type, data } = body;

  if (!type || !isAllowedType(type)) {
    return badRequest(res, "Unsupported content type.");
  }

  if (!data || typeof data !== "object") {
    return badRequest(res, "Invalid payload. Expected data object.");
  }

  const cleanData = sanitizePayload(type, data);

  if (type === "verse" && !cleanData.verse) {
    return badRequest(res, "Verse text is required.");
  }

  if (type !== "verse" && !cleanData.name) {
    return badRequest(res, "Name is required.");
  }

  const document = {
    _type: type,
    ...cleanData,
  };

  const created = await sanityClient.create(document);

  return res.status(201).json({
    ok: true,
    id: created._id,
    data: created,
  });
}

async function updateContent(req, res) {
  const body = parseBody(req);
  const { id, type, data } = body;

  if (!id || typeof id !== "string") {
    return badRequest(res, "Content id is required.");
  }

  if (!type || !isAllowedType(type)) {
    return badRequest(res, "Unsupported content type.");
  }

  if (!data || typeof data !== "object") {
    return badRequest(res, "Invalid payload. Expected data object.");
  }

  const cleanData = sanitizePayload(type, data);

  const existing = await sanityClient.getDocument(id);
  if (!existing) {
    return res.status(404).json({ ok: false, error: "Document not found." });
  }

  if (existing._type !== type) {
    return badRequest(res, "Type mismatch for this document id.");
  }

  const updated = await sanityClient.patch(id).set(cleanData).commit({
    autoGenerateArrayKeys: true,
  });

  return res.status(200).json({
    ok: true,
    id: updated._id,
    data: updated,
  });
}

async function deleteContent(req, res) {
  const body = parseBody(req);
  const { id } = body;

  if (!id || typeof id !== "string") {
    return badRequest(res, "Content id is required.");
  }

  const existing = await sanityClient.getDocument(id);
  if (!existing) {
    return res.status(404).json({ ok: false, error: "Document not found." });
  }

  if (!isAllowedType(existing._type)) {
    return badRequest(res, "Document type is not allowed for this endpoint.");
  }

  await sanityClient.delete(id);

  return res.status(200).json({ ok: true, id });
}

export default async function handler(req, res) {
  withCors(res);

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  try {
    if (req.method === "POST") {
      return await createContent(req, res);
    }

    if (req.method === "PATCH") {
      return await updateContent(req, res);
    }

    if (req.method === "DELETE") {
      return await deleteContent(req, res);
    }

    return methodNotAllowed(res, allowedMethods);
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: "Unexpected server error.",
      details: error.message,
    });
  }
}
