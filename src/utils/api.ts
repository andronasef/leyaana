import { createClient } from "@sanity/client";
import { SettingsList, getSetting } from "./settings";
import { Period, getPeriodKey } from "./period";

export { getPeriodKey };
export type { Period };

const sanityClient = createClient({
  projectId: import.meta.env.VITE_SANITY_PROJECT_ID || "kfme7y2v",
  dataset: import.meta.env.VITE_SANITY_DATASET || "production",
  apiVersion: import.meta.env.VITE_SANITY_API_VERSION || "2024-01-01",
  useCdn: true,
});

export type ContentType = "verse" | "godName" | "heavenlyBlessing";

type BaseDocument = {
  _id: string;
  _type: ContentType;
  order?: number;
  _createdAt?: string;
};

export type Verse = BaseDocument & {
  _type: "verse";
  title?: string;
  verse: string;
};

export type NamedContent = BaseDocument & {
  _type: "godName" | "heavenlyBlessing";
  name: string;
  mean?: string;
  content?: string;
};

type ContentInput = {
  title?: string;
  verse?: string;
  name?: string;
  mean?: string;
  content?: string;
  order?: number;
};

type MutationShape = {
  id?: string;
  type: ContentType;
  data?: ContentInput;
};

type MutationHttpMethod = "POST" | "PATCH" | "DELETE";

type PendingMutationOperation = "create" | "update" | "delete";

type PendingMutation = {
  queueId: string;
  operation: PendingMutationOperation;
  type: ContentType;
  id?: string;
  data?: ContentInput;
  createdAt: string;
};

export type MutationResult = {
  ok: boolean;
  id?: string;
  data?: unknown;
  queued?: boolean;
  queueId?: string;
  error?: string;
  details?: string;
};

const contentQueries: Record<ContentType, string> = {
  verse:
    '*[_type == "verse"] | order(coalesce(order, 999999) asc, _createdAt asc){_id, _type, _createdAt, order, title, verse}',
  godName:
    '*[_type == "godName"] | order(coalesce(order, 999999) asc, _createdAt asc){_id, _type, _createdAt, order, name, mean, content}',
  heavenlyBlessing:
    '*[_type == "heavenlyBlessing"] | order(coalesce(order, 999999) asc, _createdAt asc){_id, _type, _createdAt, order, name, mean, content}',
};

const contentCacheKeys: Record<ContentType, string> = {
  verse: "content-cache:verse",
  godName: "content-cache:godName",
  heavenlyBlessing: "content-cache:heavenlyBlessing",
};

const staticFallbackUrls: Record<ContentType, string> = {
  verse: "/verses.json",
  godName: "/godNames.json",
  heavenlyBlessing: "/heavenlyBlessings.json",
};

const pendingMutationsStorageKey = "content-pending-mutations:v1";
const pendingMutationsChangedEvent = "content-pending-mutations:changed";

function supportsStorage() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function safeParseJson<T>(raw: string | null, fallback: T): T {
  if (!raw) {
    return fallback;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function readFromStorage<T>(key: string, fallback: T): T {
  if (!supportsStorage()) {
    return fallback;
  }

  return safeParseJson(localStorage.getItem(key), fallback);
}

function writeToStorage<T>(key: string, value: T) {
  if (!supportsStorage()) {
    return;
  }

  localStorage.setItem(key, JSON.stringify(value));
}

function emitPendingMutationsChanged() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent(pendingMutationsChangedEvent));
}

function readPendingMutations() {
  return readFromStorage<PendingMutation[]>(pendingMutationsStorageKey, []);
}

function writePendingMutations(mutations: PendingMutation[]) {
  writeToStorage(pendingMutationsStorageKey, mutations);
  emitPendingMutationsChanged();
}

function makeQueueId() {
  return `queue-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function makeOfflineContentId() {
  return `offline-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function queueMutation(
  mutation: Omit<PendingMutation, "queueId" | "createdAt">,
): PendingMutation {
  const queued: PendingMutation = {
    ...mutation,
    queueId: makeQueueId(),
    createdAt: new Date().toISOString(),
  };

  const all = readPendingMutations();
  all.push(queued);
  writePendingMutations(all);

  return queued;
}

function getCachedContent(type: ContentType) {
  return readFromStorage<BaseDocument[]>(contentCacheKeys[type], []);
}

function setCachedContent(type: ContentType, content: BaseDocument[]) {
  writeToStorage(contentCacheKeys[type], content);
}

function asNumber(value: unknown, fallback: number) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeContentArray(type: ContentType, raw: unknown) {
  if (!Array.isArray(raw)) {
    return [] as BaseDocument[];
  }

  return raw
    .map((item, index) => normalizeContentItem(type, item, index))
    .filter((item): item is BaseDocument => Boolean(item));
}

function normalizeContentItem(
  type: ContentType,
  raw: unknown,
  index: number,
): BaseDocument | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const source = raw as Record<string, unknown>;
  const _id =
    typeof source._id === "string"
      ? source._id
      : typeof source.id === "string"
        ? source.id
        : `${type}-${index}`;
  const _createdAt =
    typeof source._createdAt === "string" ? source._createdAt : undefined;
  const order = asNumber(source.order, index);

  if (type === "verse") {
    const verse =
      typeof source.verse === "string"
        ? source.verse
        : typeof source.content === "string"
          ? source.content
          : "";
    const title = typeof source.title === "string" ? source.title : undefined;

    return {
      _id,
      _type: "verse",
      _createdAt,
      order,
      title,
      verse,
    } as Verse;
  }

  const name =
    typeof source.name === "string"
      ? source.name
      : typeof source.title === "string"
        ? source.title
        : "";
  const mean = typeof source.mean === "string" ? source.mean : undefined;
  const content =
    typeof source.content === "string" ? source.content : undefined;

  return {
    _id,
    _type: type,
    _createdAt,
    order,
    name,
    mean,
    content,
  } as NamedContent;
}

function sortContent<T extends BaseDocument>(items: T[]) {
  return [...items].sort((first, second) => {
    const firstOrder = typeof first.order === "number" ? first.order : 999999;
    const secondOrder =
      typeof second.order === "number" ? second.order : 999999;

    if (firstOrder !== secondOrder) {
      return firstOrder - secondOrder;
    }

    const firstCreated = first._createdAt || first._id;
    const secondCreated = second._createdAt || second._id;
    return firstCreated.localeCompare(secondCreated);
  });
}

function patchItemWithData(
  type: ContentType,
  item: BaseDocument,
  data?: ContentInput,
) {
  if (!data) {
    return item;
  }

  if (type === "verse") {
    const verseItem = item as Verse;
    return {
      ...verseItem,
      title: typeof data.title === "string" ? data.title : verseItem.title,
      verse: typeof data.verse === "string" ? data.verse : verseItem.verse,
      order: asNumber(data.order, verseItem.order ?? 0),
    } as Verse;
  }

  const namedItem = item as NamedContent;
  return {
    ...namedItem,
    name: typeof data.name === "string" ? data.name : namedItem.name,
    mean: typeof data.mean === "string" ? data.mean : namedItem.mean,
    content:
      typeof data.content === "string" ? data.content : namedItem.content,
    order: asNumber(data.order, namedItem.order ?? 0),
  } as NamedContent;
}

function createLocalItemFromMutation(
  type: ContentType,
  id: string,
  data?: ContentInput,
  createdAt = new Date().toISOString(),
) {
  if (type === "verse") {
    return {
      _id: id,
      _type: "verse",
      _createdAt: createdAt,
      order: asNumber(data?.order, 0),
      title: typeof data?.title === "string" ? data.title : undefined,
      verse: typeof data?.verse === "string" ? data.verse : "",
    } as Verse;
  }

  return {
    _id: id,
    _type: type,
    _createdAt: createdAt,
    order: asNumber(data?.order, 0),
    name: typeof data?.name === "string" ? data.name : "",
    mean: typeof data?.mean === "string" ? data.mean : undefined,
    content: typeof data?.content === "string" ? data.content : undefined,
  } as NamedContent;
}

function applyPendingMutations(type: ContentType, baseItems: BaseDocument[]) {
  const pending = readPendingMutations().filter((item) => item.type === type);
  let result = [...baseItems];

  for (const mutation of pending) {
    if (mutation.operation === "create") {
      const localId = mutation.id || `offline-${mutation.queueId}`;
      const alreadyExists = result.some((item) => item._id === localId);

      if (!alreadyExists) {
        result.push(
          createLocalItemFromMutation(
            type,
            localId,
            mutation.data,
            mutation.createdAt,
          ),
        );
      }
      continue;
    }

    if (!mutation.id) {
      continue;
    }

    if (mutation.operation === "update") {
      result = result.map((item) =>
        item._id === mutation.id
          ? patchItemWithData(type, item, mutation.data)
          : item,
      );
      continue;
    }

    if (mutation.operation === "delete") {
      result = result.filter((item) => item._id !== mutation.id);
    }
  }

  return sortContent(result);
}

async function loadStaticFallback(type: ContentType) {
  const response = await fetch(staticFallbackUrls[type], {
    cache: "force-cache",
  });
  if (!response.ok) {
    return [] as BaseDocument[];
  }

  const json = await response.json();
  return normalizeContentArray(type, json);
}

async function fetchFromSanity(type: ContentType) {
  const query = contentQueries[type];
  const data = await sanityClient.fetch(query);
  const normalized = normalizeContentArray(type, data);
  setCachedContent(type, normalized);
  return normalized;
}

function isLikelyOfflineError(error: unknown) {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return true;
  }

  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return (
    message.includes("failed to fetch") ||
    message.includes("networkerror") ||
    message.includes("load failed") ||
    message.includes("network request failed")
  );
}

async function getContentWithOfflineSupport(type: ContentType) {
  try {
    const live = await fetchFromSanity(type);
    return applyPendingMutations(type, live);
  } catch (error) {
    const cached = getCachedContent(type);
    if (cached.length > 0) {
      return applyPendingMutations(type, cached);
    }

    const fallback = await loadStaticFallback(type).catch(() => []);
    if (fallback.length > 0) {
      setCachedContent(type, fallback);
      return applyPendingMutations(type, fallback);
    }

    throw error;
  }
}

export async function getVerses() {
  return (await getContentWithOfflineSupport("verse")) as Verse[];
}

export async function getGodNames() {
  return (await getContentWithOfflineSupport("godName")) as NamedContent[];
}

export async function getHeavenlyBlessings() {
  return (await getContentWithOfflineSupport(
    "heavenlyBlessing",
  )) as NamedContent[];
}

async function sendMutationRequest(
  method: MutationHttpMethod,
  payload: Record<string, unknown>,
) {
  const response = await fetch("/api/content", {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return parseMutationResponse(response);
}

async function refreshTypesFromServer(types: ContentType[]) {
  if (!types.length) {
    return;
  }

  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return;
  }

  await Promise.all(
    types.map(async (type) => {
      try {
        const fresh = await fetchFromSanity(type);
        setCachedContent(type, fresh);
      } catch {
        // Keep existing cache on partial refresh failures.
      }
    }),
  );
}

export async function createContent(
  type: ContentType,
  data: MutationShape["data"],
) {
  const localId = makeOfflineContentId();

  try {
    const result = await sendMutationRequest("POST", {
      type,
      data,
    });

    await refreshTypesFromServer([type]);
    return result;
  } catch (error) {
    if (!isLikelyOfflineError(error)) {
      throw error;
    }

    const queued = queueMutation({
      operation: "create",
      type,
      id: localId,
      data,
    });

    return {
      ok: true,
      id: localId,
      queued: true,
      queueId: queued.queueId,
    } as MutationResult;
  }
}

export async function updateContent({ id, type, data }: MutationShape) {
  if (!id) {
    throw new Error("Content id is required for updates.");
  }

  try {
    const result = await sendMutationRequest("PATCH", {
      id,
      type,
      data,
    });

    await refreshTypesFromServer([type]);
    return result;
  } catch (error) {
    if (!isLikelyOfflineError(error)) {
      throw error;
    }

    const queued = queueMutation({
      operation: "update",
      type,
      id,
      data,
    });

    return {
      ok: true,
      id,
      queued: true,
      queueId: queued.queueId,
    } as MutationResult;
  }
}

export async function deleteContent(id: string, type?: ContentType) {
  try {
    const result = await sendMutationRequest("DELETE", {
      id,
    });

    await refreshTypesFromServer(
      type ? [type] : ["verse", "godName", "heavenlyBlessing"],
    );
    return result;
  } catch (error) {
    if (!isLikelyOfflineError(error)) {
      throw error;
    }

    const queuedType = type || "verse";
    const queued = queueMutation({
      operation: "delete",
      type: queuedType,
      id,
    });

    return {
      ok: true,
      id,
      queued: true,
      queueId: queued.queueId,
    } as MutationResult;
  }
}

export function subscribePendingMutations(onChange: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handler = () => onChange();
  window.addEventListener(pendingMutationsChangedEvent, handler);

  return () => {
    window.removeEventListener(pendingMutationsChangedEvent, handler);
  };
}

export function getPendingMutationCount() {
  return readPendingMutations().length;
}

export async function flushPendingMutations() {
  const initial = readPendingMutations();
  if (!initial.length) {
    return { processed: 0, failed: 0, remaining: 0 };
  }

  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return {
      processed: 0,
      failed: 0,
      remaining: initial.length,
    };
  }

  let queue = [...initial];
  const idMap = new Map<string, string>();
  const touchedTypes = new Set<ContentType>();
  let processed = 0;
  let failed = 0;

  while (queue.length > 0) {
    const mutation = queue[0];
    const resolvedId = mutation.id
      ? idMap.get(mutation.id) || mutation.id
      : undefined;

    try {
      if (mutation.operation === "create") {
        const result = await sendMutationRequest("POST", {
          type: mutation.type,
          data: mutation.data,
        });

        if (
          mutation.id &&
          typeof result.id === "string" &&
          result.id !== mutation.id
        ) {
          idMap.set(mutation.id, result.id);
        }
      }

      if (mutation.operation === "update") {
        if (!resolvedId) {
          throw new Error("Queued update is missing id.");
        }

        await sendMutationRequest("PATCH", {
          id: resolvedId,
          type: mutation.type,
          data: mutation.data,
        });
      }

      if (mutation.operation === "delete") {
        if (!resolvedId) {
          throw new Error("Queued delete is missing id.");
        }

        await sendMutationRequest("DELETE", {
          id: resolvedId,
        });
      }

      touchedTypes.add(mutation.type);
      queue = queue.slice(1);
      writePendingMutations(queue);
      processed += 1;
    } catch (error) {
      failed += 1;

      if (isLikelyOfflineError(error)) {
        break;
      }

      // Keep the failing item in queue so user can retry without data loss.
      break;
    }
  }

  await refreshTypesFromServer(Array.from(touchedTypes));

  return {
    processed,
    failed,
    remaining: queue.length,
  };
}

async function parseMutationResponse(response: Response) {
  const result = (await response
    .json()
    .catch(
      () => ({ ok: false }) as { ok: false; error?: string; details?: string },
    )) as MutationResult;

  if (!response.ok || !result.ok) {
    if (response.status === 404) {
      throw new Error(
        "Content API endpoint was not found. In local development, run the Vite dev server from this project so /api/content is available.",
      );
    }

    const backendMessage =
      typeof result.error === "string" && result.error.trim().length > 0
        ? result.error
        : `Mutation failed with status ${response.status}.`;

    const details =
      typeof result.details === "string" && result.details.trim().length > 0
        ? ` ${result.details}`
        : "";

    throw new Error(`${backendMessage}${details}`.trim());
  }

  return result;
}

function hashValue(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function pickRandomItem<T>(allItems: T[]) {
  if (!allItems.length) {
    return undefined;
  }

  const randomIndex = Math.floor(Math.random() * allItems.length);
  return allItems[randomIndex];
}

export function getRandomTodayVerse(allVerses: Verse[]) {
  if (!allVerses.length) {
    return undefined;
  }

  const dateKey = new Date().toISOString().slice(0, 10);
  const userKey = getPersonName();
  const verseIndex = hashValue(`${dateKey}:${userKey}`) % allVerses.length;

  return allVerses[verseIndex];
}

export function getPeriodItem<T>(
  allItems: T[],
  typeKey: string,
  period: Period = "daily",
): T | undefined {
  if (!allItems.length) return undefined;
  const userKey = getPersonName();
  const index =
    hashValue(`${getPeriodKey(period)}:${userKey}:${typeKey}`) %
    allItems.length;
  return allItems[index];
}

export function getDailyItem<T>(allItems: T[], typeKey: string): T | undefined {
  return getPeriodItem(allItems, typeKey, "daily");
}

export function parseVerse(myVerse: Verse) {
  const bioVerse = myVerse.verse.split("---");
  let parsedText = myVerse.verse;

  // Check if it for male or female first
  if (bioVerse.length === 2) {
    parsedText = isMale() ? bioVerse[0] : bioVerse[1];
  }

  // Replace variables
  parsedText = parseTemplateVariables(parsedText);

  return {
    ...myVerse,
    verse: parsedText.trim(),
  };
}

export function parseNamedContent(item: NamedContent): NamedContent {
  return {
    ...item,
    name: parseTemplateVariables(item.name).trim(),
    mean: item.mean ? parseTemplateVariables(item.mean).trim() : item.mean,
    content: item.content
      ? parseTemplateVariables(item.content).trim()
      : item.content,
  };
}

function isMale() {
  const isUserMale = getSetting(SettingsList.isMale) === "true";
  return Boolean(isUserMale);
}

function getPersonName(): string {
  return getSetting(SettingsList.name) ?? "[لو سمحت دخل اسمك في الاعدادات]";
}

const replaceVars = {
  "<الاسم>": getPersonName,
};

function parseTemplateVariables(text: string) {
  let parsedText = text;
  Object.entries(replaceVars).forEach(([key, value]) => {
    parsedText = parsedText.split(key).join(value());
  });

  return parsedText;
}
