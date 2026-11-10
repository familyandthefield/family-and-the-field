import snapshotCsv from "../data/season-snapshot.csv?raw";
import snapshotMeta from "../data/season-snapshot.json";
import { seasonSheetCsvUrl } from "../config/season-sheet";
import { buildSeasonView, parseSeasonCsv, type SeasonPlan, type SeasonView } from "./season-plan";

export const SEASON_CACHE_CONTROL = "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400";

const FETCH_TIMEOUT_MS = 5000;
const LIVE_MEMORY_MS = 5 * 60 * 1000;

export type SeasonSource = "live" | "snapshot" | "unavailable";

export type SeasonLoad = {
  view: SeasonView;
  source: SeasonSource;
  fetchedAt: string | null;
};

type CachedPlan = {
  expires: number;
  plan: SeasonPlan;
  source: "live";
  fetchedAt: string;
};

let liveCache: CachedPlan | null = null;

export async function loadSeason(now = new Date()): Promise<SeasonLoad> {
  const loaded = await loadPlan();
  return {
    view: buildSeasonView(loaded.plan, now),
    source: loaded.source,
    fetchedAt: loaded.fetchedAt,
  };
}

export function seasonResponseBody(season: SeasonLoad) {
  return {
    source: season.source,
    fetchedAt: season.fetchedAt,
    weekLabel: season.view.weekLabel,
    harvestingNow: season.view.harvestingNow,
    comingSoon: season.view.comingSoon,
    sowingNow: season.view.sowingNow,
  };
}

async function loadPlan(): Promise<{ plan: SeasonPlan; source: SeasonSource; fetchedAt: string | null }> {
  if (liveCache && liveCache.expires > Date.now()) {
    return liveCache;
  }

  try {
    const csv = await fetchSeasonCsv();
    const plan = parseSeasonCsv(csv);
    const fetchedAt = new Date().toISOString();
    liveCache = { expires: Date.now() + LIVE_MEMORY_MS, plan, source: "live", fetchedAt };
    return liveCache;
  } catch (error) {
    console.error("Season sheet fetch failed; using the saved snapshot.", error);
    try {
      return {
        plan: parseSeasonCsv(snapshotCsv),
        source: "snapshot",
        fetchedAt: snapshotMeta.fetchedAt,
      };
    } catch (snapshotError) {
      console.error("Season snapshot could not be read.", snapshotError);
      return {
        plan: { varieties: [] },
        source: "unavailable",
        fetchedAt: null,
      };
    }
  }
}

async function fetchSeasonCsv(): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(seasonSheetCsvUrl(), {
      signal: controller.signal,
      redirect: "follow",
      cache: "no-store",
      headers: { accept: "text/csv,text/plain,*/*" },
    });
    if (!response.ok) throw new Error(`Season sheet responded ${response.status}`);
    const text = await response.text();
    if (!looksLikeCsv(text)) throw new Error("Season sheet did not return a CSV");
    return text;
  } finally {
    clearTimeout(timer);
  }
}

function looksLikeCsv(text: string): boolean {
  const start = text.trimStart().slice(0, 300).toLowerCase();
  if (!start) return false;
  if (start.startsWith("<!doctype") || start.startsWith("<html") || start.startsWith("{")) return false;
  return start.includes("crop") || start.includes(",");
}
