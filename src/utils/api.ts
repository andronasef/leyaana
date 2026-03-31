import { createClient } from "@sanity/client";
import { SettingsList, getSetting } from "./settings";

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

export async function getVerses() {
  const query =
    '*[_type == "verse"] | order(coalesce(order, 999999) asc, _createdAt asc){_id, _type, _createdAt, order, title, verse}';
  return (await sanityClient.fetch(query)) as Verse[];
}

export async function getGodNames() {
  const query =
    '*[_type == "godName"] | order(coalesce(order, 999999) asc, _createdAt asc){_id, _type, _createdAt, order, name, mean, content}';
  return (await sanityClient.fetch(query)) as NamedContent[];
}

export async function getHeavenlyBlessings() {
  const query =
    '*[_type == "heavenlyBlessing"] | order(coalesce(order, 999999) asc, _createdAt asc){_id, _type, _createdAt, order, name, mean, content}';
  return (await sanityClient.fetch(query)) as NamedContent[];
}

export async function createContent(
  type: ContentType,
  data: MutationShape["data"],
) {
  const response = await fetch("/api/content", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      type,
      data,
    }),
  });

  return parseMutationResponse(response);
}

export async function updateContent({ id, type, data }: MutationShape) {
  const response = await fetch("/api/content", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id,
      type,
      data,
    }),
  });

  return parseMutationResponse(response);
}

export async function deleteContent(id: string) {
  const response = await fetch("/api/content", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id,
    }),
  });

  return parseMutationResponse(response);
}

async function parseMutationResponse(response: Response) {
  const result = await response
    .json()
    .catch(
      () => ({ ok: false }) as { ok: false; error?: string; details?: string },
    );

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
