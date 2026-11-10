import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  buildSeasonView,
  gardenWeek,
  parseSeasonCsv,
  shiftWeek,
  weekRangeLabel,
} from "../src/lib/season-plan.ts";

const snapshot = readFileSync(new URL("../src/data/season-snapshot.csv", import.meta.url), "utf8");

describe("garden weeks", () => {
  it("uses Isle of Man civil time and week 4 from the 22nd", () => {
    assert.deepEqual(gardenWeek(new Date("2026-11-10T12:00:00Z")), {
      year: 2026,
      month: 11,
      week: 2,
    });
    assert.equal(weekRangeLabel(gardenWeek(new Date("2026-11-10T12:00:00Z"))), "8\u201314 November");
    assert.equal(weekRangeLabel({ year: 2026, month: 11, week: 4 }), "22\u201330 November");
    assert.equal(weekRangeLabel({ year: 2026, month: 2, week: 4 }), "22\u201328 February");
    assert.equal(weekRangeLabel({ year: 2028, month: 2, week: 4 }), "22\u201329 February");
    assert.deepEqual(gardenWeek(new Date("2026-06-30T23:30:00Z")), {
      year: 2026,
      month: 7,
      week: 1,
    });
  });

  it("steps across the year without skipping a missing sheet column", () => {
    assert.deepEqual(shiftWeek({ year: 2026, month: 11, week: 2 }, 4), {
      year: 2026,
      month: 12,
      week: 2,
    });
    assert.deepEqual(shiftWeek({ year: 2026, month: 12, week: 4 }, 1), {
      year: 2027,
      month: 1,
      week: 1,
    });
  });
});

describe("season sheet parser", () => {
  it("trims names, inherits a blank crop, and keeps a short final month", () => {
    const plan = parseSeasonCsv(`Crop,Variety,Bed,Succession,January,,,December
Garlic, Picardy Wight ,,,D
,Solent Wight,,,
Mustard,Grrens,,,

Cabbage,Golden Acre ,,,h
`);
    assert.deepEqual(
      plan.varieties.map((variety) => [variety.crop, variety.variety, variety.weeks[0], variety.weeks[11][0]]),
      [
        ["Garlic", "Picardy Wight", ["D", null, null, null], null],
        ["Garlic", "Solent Wight", [null, null, null, null], null],
        ["Mustard", "Grrens", [null, null, null, null], null],
        ["Cabbage", "Golden Acre", ["H", null, null, null], null],
      ],
    );
  });

  it("reads the saved garden plan", () => {
    const plan = parseSeasonCsv(snapshot);
    const garlic = plan.varieties.find((variety) => variety.variety === "Picardy Wight");
    const rocket = plan.varieties.find((variety) => variety.crop === "Rocket" && variety.variety === "Cultivated");
    const acre = plan.varieties.find((variety) => variety.variety.startsWith("Golden Acre"));
    assert.ok(garlic);
    assert.deepEqual(garlic.weeks[0], ["D", null, null, null]);
    assert.ok(rocket);
    assert.equal(rocket.weeks[0][3], "H");
    assert.equal(acre?.variety, "Golden Acre");
    assert.equal(plan.varieties.some((variety) => !variety.crop), false);

    const march = buildSeasonView(plan, new Date("2026-03-01T12:00:00Z"));
    assert.deepEqual(march.harvestingNow, [
      { crop: "Celery", varieties: ["Golden SF"] },
      { crop: "Rocket", varieties: ["Cultivated"] },
    ]);
    assert.deepEqual(march.comingSoon.map((group) => group.crop), ["Rocket", "Leek"]);
    assert.equal(march.comingSoon[0]?.varieties[0]?.name, "Salad");
    assert.equal(march.comingSoon[0]?.varieties[0]?.fromLabel, "22\u201331 March");
    assert.equal(march.comingSoon[1]?.varieties[0]?.name, "Bleu de Solaise");
    assert.equal(march.comingSoon[1]?.varieties[0]?.fromLabel, "15\u201321 March");

    const april = buildSeasonView(plan, new Date("2026-04-14T12:00:00Z"));
    assert.deepEqual(
      april.harvestingNow.map((group) => group.crop),
      ["Celery", "Rocket", "Leek", "Chard"],
    );
    assert.deepEqual(april.harvestingNow.find((group) => group.crop === "Rocket")?.varieties, ["Salad", "Wild"]);

    const november = buildSeasonView(plan, new Date("2026-11-10T15:00:00Z"));
    assert.equal(november.weekLabel, "8\u201314 November");
    assert.deepEqual(november.harvestingNow, []);
    assert.deepEqual(november.comingSoon, []);
    assert.deepEqual(november.sowingNow, []);
    assert.ok(november.crops.length > 10);
  });
});
