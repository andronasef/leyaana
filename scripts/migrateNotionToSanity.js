import { createClient } from "@sanity/client";
import fs from "fs";
import path from "path";
import "dotenv/config";

const projectId = process.env.SANITY_PROJECT_ID || "kfme7y2v";
const dataset = process.env.SANITY_DATASET || "production";
const token = process.env.SANITY_TOKEN;
const apiVersion = process.env.SANITY_API_VERSION || "2024-01-01";
const isDryRun = process.argv.includes("--dry-run");

if (!isDryRun && !token) {
  console.error(
    "Missing SANITY_TOKEN. Set it in your environment before running live migration.",
  );
  process.exit(1);
}

const client = isDryRun
  ? null
  : createClient({
      projectId,
      dataset,
      apiVersion,
      token,
      useCdn: false,
    });

const rootDir = process.cwd();
const inputFiles = [
  {
    type: "godName",
    filePath: path.join(rootDir, "public", "godNames.json"),
  },
  {
    type: "heavenlyBlessing",
    filePath: path.join(rootDir, "public", "heavenlyBlessings.json"),
  },
];

function normalizeText(value) {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim();
}

function buildSanityId(type, notionId, fallbackIndex) {
  if (notionId) {
    return `${type}-${notionId}`;
  }
  return `${type}-legacy-${fallbackIndex}`;
}

function readJson(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Input file does not exist: ${filePath}`);
  }

  const content = fs.readFileSync(filePath, "utf8");
  const json = JSON.parse(content);

  if (!Array.isArray(json)) {
    throw new Error(`Input file must contain an array: ${filePath}`);
  }

  return json;
}

async function migrateCollection(type, filePath) {
  const items = readJson(filePath);
  const summary = {
    type,
    sourceCount: items.length,
    upsertedCount: 0,
    skippedCount: 0,
    errors: [],
  };

  console.log(
    `\n[${type}] Found ${items.length} records in ${path.relative(rootDir, filePath)}.`,
  );

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    const notionId = normalizeText(item.id);
    const name = normalizeText(item.name);
    const mean = normalizeText(item.mean);
    const content = typeof item.content === "string" ? item.content : "";

    if (!name) {
      summary.skippedCount += 1;
      summary.errors.push(`Skipped index ${index}: missing name.`);
      continue;
    }

    const _id = buildSanityId(type, notionId, index);

    const doc = {
      _id,
      _type: type,
      name,
      mean,
      content,
      order: index,
    };

    if (notionId) {
      doc.notionId = notionId;
    }

    if (isDryRun) {
      summary.upsertedCount += 1;
      continue;
    }

    try {
      if (!client) {
        throw new Error("Sanity client is not initialized.");
      }
      await client.createOrReplace(doc);
      summary.upsertedCount += 1;
    } catch (error) {
      summary.errors.push(`Failed index ${index} (${_id}): ${error.message}`);
    }
  }

  return summary;
}

function printSummary(result) {
  console.log("\nMigration summary");
  console.log("=================");

  for (const collection of result.collections) {
    console.log(`\nType: ${collection.type}`);
    console.log(`Source count : ${collection.sourceCount}`);
    console.log(`Upserted     : ${collection.upsertedCount}`);
    console.log(`Skipped      : ${collection.skippedCount}`);
    console.log(`Errors       : ${collection.errors.length}`);

    if (collection.errors.length > 0) {
      collection.errors.slice(0, 10).forEach((message) => {
        console.log(`- ${message}`);
      });

      if (collection.errors.length > 10) {
        console.log(`- ...and ${collection.errors.length - 10} more`);
      }
    }
  }

  console.log(`\nMode: ${result.mode}`);
  console.log("Finished.");
}

(async () => {
  try {
    console.log(
      `Starting Notion JSON -> Sanity migration (${isDryRun ? "dry-run" : "live"})`,
    );

    const collections = [];

    for (const input of inputFiles) {
      // eslint-disable-next-line no-await-in-loop
      const summary = await migrateCollection(input.type, input.filePath);
      collections.push(summary);
    }

    printSummary({
      mode: isDryRun ? "dry-run" : "live",
      collections,
    });

    const hasErrors = collections.some(
      (collection) => collection.errors.length > 0,
    );
    if (hasErrors) {
      process.exitCode = 1;
    }
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
})();
