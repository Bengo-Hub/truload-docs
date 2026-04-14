import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const siteDir = path.join(root, "site");
const outDir = path.join(siteDir, "exports");

if (!fs.existsSync(siteDir)) {
  throw new Error("site directory not found. Run mkdocs build first.");
}

fs.mkdirSync(outDir, { recursive: true });

const targets = [
  {
    url: pathToFileURL(path.join(siteDir, "user-manual", "index.html")).href,
    output: path.join(outDir, "User-Manual.pdf"),
  },
  {
    url: pathToFileURL(path.join(siteDir, "technical", "index.html")).href,
    output: path.join(outDir, "Technical-Operations-Manual.pdf"),
  },
  {
    url: pathToFileURL(path.join(siteDir, "evidence", "index.html")).href,
    output: path.join(outDir, "Client-Evidence-Pack.pdf"),
  },
];

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

for (const item of targets) {
  await page.goto(item.url, { waitUntil: "networkidle" });
  await page.pdf({
    path: item.output,
    format: "A4",
    printBackground: true,
    margin: { top: "12mm", right: "12mm", bottom: "12mm", left: "12mm" },
  });
  console.log(`Generated ${item.output}`);
}

await browser.close();
