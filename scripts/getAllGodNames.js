import { Client } from "@notionhq/client";
import "dotenv/config";
import fs from "fs";
import { NotionToMarkdown } from "notion-to-md";
import path from "path";

const saveNamesPath = `${process.cwd()}/public/godNames.json`;

// Database ID from the Notion URL
const DATABASE_ID = "11586b1e0b02805ba5cefaa1b0b77ebd";

// Initialize Notion client
const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

// Initialize NotionToMarkdown
const n2m = new NotionToMarkdown({ notionClient: notion });

export async function getAllGodNames() {
  try {
    // Query the database
    const response = await notion.databases.query({
      database_id: DATABASE_ID,
    });

    // Process each page
    const godNames = await Promise.all(
      response.results.map(async (page) => {
        // Get page properties
        const name = page.properties.Name.title[0]?.plain_text || "";
        const mean = page.properties.Mean.rich_text[0]?.plain_text || "";

        // Get page content as markdown
        const mdBlocks = await n2m.pageToMarkdown(page.id);
        const content = n2m.toMarkdownString(mdBlocks);

        return {
          name,
          mean,
          content: content.parent,
        };
      })
    );

    return godNames;
  } catch (error) {
    console.error("Error fetching god names:", error);
    throw error;
  }
}

// Self-executing function to run the script
(async () => {
  try {
    const jsonData = JSON.stringify(await getAllGodNames(), null, 2);
    const dir = path.dirname(saveNamesPath);

    // Create the directory if it doesn't exist
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(saveNamesPath, jsonData);
    console.log("God names saved to godNames.json");
  } catch (error) {
    console.error("Error in main execution:", error);
    process.exit(1);
  }
})();
