import type { APIRoute } from "astro";
import { loadSeason, SEASON_CACHE_CONTROL, seasonResponseBody } from "../../lib/load-season";

export const prerender = false;

export const GET: APIRoute = async () => {
  const season = await loadSeason();
  return new Response(JSON.stringify(seasonResponseBody(season)), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": SEASON_CACHE_CONTROL,
    },
  });
};
