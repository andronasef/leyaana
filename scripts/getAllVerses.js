import { createClient } from "@sanity/client";
import fs from "fs/promises";
import "dotenv/config";

const saveVersesPath = `${process.cwd()}/src/verses/verses.json`;

const client = createClient({
  projectId: "kfme7y2v",
  dataset: "production",
  apiVersion: "2021-06-07", // or your preferred version
  token: process.env.SANITY_TOKEN, //  a token with read permissions
  useCdn: false,
});

export async function getAllVerses() {
  const verses = await client.fetch('*[_type == "verse"]{_id, verse }');
  return verses;
}

(async () => {
  const jsonData = JSON.stringify(await getAllVerses(), null, 2); // Pretty print with indentation
  await fs.writeFile(saveVersesPath, jsonData);
  console.log("Verses saved to verses.json");
})();
