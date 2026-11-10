import { readFile, writeFile } from "node:fs/promises";
import sheet from "../src/config/season-sheet.json" with { type: "json" };

const csvPath = new URL("../src/data/season-snapshot.csv", import.meta.url);
const metaPath = new URL("../src/data/season-snapshot.json", import.meta.url);
const url = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(sheet.spreadsheetId)}/export?format=csv&gid=${encodeURIComponent(sheet.gid)}`;

function normalise(text) {
  return text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n").trimEnd() + "\n";
}

try {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  const response = await fetch(url, {
    signal: controller.signal,
    redirect: "follow",
    headers: { accept: "text/csv,text/plain,*/*" },
  });
  clearTimeout(timer);
  if (!response.ok) throw new Error(`Season sheet responded ${response.status}`);
  const csv = normalise(await response.text());
  const start = csv.trimStart().slice(0, 200).toLowerCase();
  if (!start.includes("crop") || start.startsWith("<!doctype") || start.startsWith("<html")) {
    throw new Error("Season sheet did not return a CSV");
  }
  const current = normalise(await readFile(csvPath, "utf8").catch(() => ""));
  if (current === csv) {
    console.log("Season snapshot already matches the sheet.");
  } else {
    await writeFile(csvPath, csv);
    await writeFile(metaPath, JSON.stringify({ fetchedAt: new Date().toISOString() }, null, 2) + "\n");
    console.log("Season snapshot updated.");
  }
} catch (error) {
  console.warn("Could not refresh the season snapshot; keeping the saved copy.");
  console.warn(error instanceof Error ? error.message : error);
}
