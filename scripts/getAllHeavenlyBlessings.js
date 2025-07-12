import { Client } from "@notionhq/client";
import "dotenv/config";
import fs from "fs";
import { NotionToMarkdown } from "notion-to-md";
import path from "path";

const saveNamesPath = `${process.cwd()}/public/heavenlyBlessings.json`;

// Database ID from the Notion URL
const DATABASE_ID = "15886b1e0b0280d9b063d8433fd964f0";

// Initialize Notion client
const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

// Initialize NotionToMarkdown
const n2m = new NotionToMarkdown({ notionClient: notion });

export async function getAllHeavenlyBlessings() {
  try {
    // Query the database
    const response = await notion.databases.query({
      database_id: DATABASE_ID,
    });

    // Process each page
    const heavenlyBlessings = await Promise.all(
      response.results.map(async (page) => {
        // Get page properties
        const name = page.properties.Name.title[0]?.plain_text || "";
        const mean =
          page.properties["Main Verse"].rich_text[0]?.plain_text || "";

        // Get page content as markdown
        const mdBlocks = await n2m.pageToMarkdown(page.id);
        const content = n2m.toMarkdownString(mdBlocks);

        return {
          name,
          mean,
          content: content.parent,
          id: page.id,
        };
      })
    );

    return heavenlyBlessings;
  } catch (error) {
    console.error("Error fetching heavenly blessings:", error);
    throw error;
  }
}

// Self-executing function to run the script
(async () => {
  try {
    const jsonData = JSON.stringify(await getAllHeavenlyBlessings(), null, 2);
    const dir = path.dirname(saveNamesPath);

    // Create the directory if it doesn't exist
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(saveNamesPath, jsonData);
    console.log("Heavenly blessings saved to heavenlyBlessings.json");
  } catch (error) {
    console.error("Error in main execution:", error);
    process.exit(1);
  }
})();
