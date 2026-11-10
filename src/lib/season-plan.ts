export const GARDEN_TIMEZONE = "Europe/Isle_of_Man";

export const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

export const ACTIVITY_LABEL = {
  G: "Sow in greenhouse",
  S: "Sow in shadehouse",
  D: "Direct sow in beds",
  T: "Transplant out",
  H: "Harvest",
} as const;

export const NOTHING_HARVESTING = "Nothing being harvested this week \u2014 check back soon.";

const MONTH_INDEX = new Map(MONTHS.map((month, index) => [month.toLowerCase(), index]));
const CODES = new Set(["G", "S", "D", "T", "H"]);

export type ActivityCode = keyof typeof ACTIVITY_LABEL;
export type SowCode = "G" | "S" | "D";
export type WeekMark = ActivityCode | null;

export type GardenWeek = {
  year: number;
  month: number;
  week: number;
};

export type VarietyPlan = {
  crop: string;
  variety: string;
  succession: string;
  weeks: WeekMark[][];
};

export type SeasonPlan = {
  varieties: VarietyPlan[];
};

export type NamedGroup = {
  crop: string;
  varieties: string[];
};

export type SowingGroup = {
  crop: string;
  code: SowCode;
  label: string;
  varieties: string[];
};

export type ComingSoonGroup = {
  crop: string;
  varieties: { name: string; fromLabel: string }[];
};

export type SeasonCrop = {
  crop: string;
  id: string;
  varieties: VarietyPlan[];
};

export type SeasonView = {
  now: GardenWeek;
  weekLabel: string;
  harvestingNow: NamedGroup[];
  comingSoon: ComingSoonGroup[];
  sowingNow: SowingGroup[];
  crops: SeasonCrop[];
};

export function parseCsv(text: string): string[][] {
  const input = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    if (inQuotes) {
      if (char === '"') {
        if (input[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"') {
      inQuotes = true;
      continue;
    }
    if (char === ",") {
      row.push(field);
      field = "";
      continue;
    }
    if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      continue;
    }
    field += char;
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

export function parseSeasonCsv(text: string): SeasonPlan {
  const table = parseCsv(text);
  if (table.length === 0) return { varieties: [] };

  const header = table[0] ?? [];
  const cropColumn = columnIndex(header, "crop", 0);
  const varietyColumn = columnIndex(header, "variety", 1);
  const successionColumn = columnIndex(header, "succession", 3);
  const monthSpans = monthColumns(header);
  const varieties: VarietyPlan[] = [];
  let currentCrop = "";

  for (const rawRow of table.slice(1)) {
    const crop = cell(rawRow, cropColumn);
    const variety = cell(rawRow, varietyColumn);
    const succession = cell(rawRow, successionColumn);
    if (!crop && !variety && !succession && !rowHasMark(rawRow, monthSpans)) continue;
    if (crop) currentCrop = crop;
    const resolvedCrop = crop || currentCrop;
    if (!resolvedCrop) continue;

    const weeks = Array.from({ length: 12 }, () => [null, null, null, null] as WeekMark[]);
    for (const span of monthSpans) {
      for (let week = 0; week < span.width; week += 1) {
        weeks[span.monthIndex][week] = parseMark(rawRow[span.start + week]);
      }
    }

    varieties.push({
      crop: resolvedCrop,
      variety,
      succession,
      weeks,
    });
  }

  return { varieties };
}

export function gardenWeek(now: Date, timeZone = GARDEN_TIMEZONE): GardenWeek {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(now);
  const read = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  const day = read("day");
  return {
    year: read("year"),
    month: read("month"),
    week: weekOfMonth(day),
  };
}

export function weekOfMonth(day: number): 1 | 2 | 3 | 4 {
  if (day <= 7) return 1;
  if (day <= 14) return 2;
  if (day <= 21) return 3;
  return 4;
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function weekRangeLabel(week: GardenWeek): string {
  const start = [1, 8, 15, 22][week.week - 1] ?? 1;
  const end = week.week === 4 ? daysInMonth(week.year, week.month) : start + 6;
  const monthName = MONTHS[week.month - 1] ?? "";
  return start === end ? `${start} ${monthName}` : `${start}\u2013${end} ${monthName}`;
}

export function shiftWeek(week: GardenWeek, by: number): GardenWeek {
  const start = (week.month - 1) * 4 + (week.week - 1);
  const next = start + by;
  const wrapped = ((next % 48) + 48) % 48;
  return {
    year: week.year + Math.floor(next / 48),
    month: Math.floor(wrapped / 4) + 1,
    week: (wrapped % 4) + 1,
  };
}

export function markAt(variety: VarietyPlan, week: GardenWeek): WeekMark {
  return variety.weeks[week.month - 1]?.[week.week - 1] ?? null;
}

export function isCurrentColumn(now: GardenWeek, monthIndex: number, weekIndex: number): boolean {
  return now.month - 1 === monthIndex && now.week - 1 === weekIndex;
}

export function buildSeasonView(plan: SeasonPlan, now: Date, timeZone = GARDEN_TIMEZONE): SeasonView {
  const week = gardenWeek(now, timeZone);
  const upcoming = [1, 2, 3, 4].map((offset) => shiftWeek(week, offset));
  const crops = groupCrops(plan.varieties);

  return {
    now: week,
    weekLabel: weekRangeLabel(week),
    harvestingNow: groupNames(plan.varieties.filter((variety) => markAt(variety, week) === "H")),
    comingSoon: comingSoon(plan.varieties, week, upcoming),
    sowingNow: sowingNow(plan.varieties, week),
    crops: crops.map((crop, index) => ({
      crop: crop.crop,
      id: cropId(crop.crop, index),
      varieties: crop.varieties,
    })),
  };
}

export function varietyLabel(variety: VarietyPlan): string {
  const name = variety.variety || variety.crop;
  return variety.succession ? `${name} \u00b7 ${variety.succession}` : name;
}

function comingSoon(varieties: VarietyPlan[], current: GardenWeek, upcoming: GardenWeek[]): ComingSoonGroup[] {
  const groups: ComingSoonGroup[] = [];
  const index = new Map<string, ComingSoonGroup>();

  for (const variety of varieties) {
    if (markAt(variety, current) === "H") continue;
    const first = upcoming.find((week) => markAt(variety, week) === "H");
    if (!first) continue;
    let group = index.get(variety.crop);
    if (!group) {
      group = { crop: variety.crop, varieties: [] };
      index.set(variety.crop, group);
      groups.push(group);
    }
    const name = variety.variety;
    if (group.varieties.some((item) => item.name === name && item.fromLabel === weekRangeLabel(first))) continue;
    group.varieties.push({ name, fromLabel: weekRangeLabel(first) });
  }

  return groups;
}

function sowingNow(varieties: VarietyPlan[], week: GardenWeek): SowingGroup[] {
  const groups: SowingGroup[] = [];
  const index = new Map<string, SowingGroup>();

  for (const variety of varieties) {
    const mark = markAt(variety, week);
    if (mark !== "G" && mark !== "S" && mark !== "D") continue;
    const key = `${variety.crop}\u0000${mark}`;
    let group = index.get(key);
    if (!group) {
      group = { crop: variety.crop, code: mark, label: ACTIVITY_LABEL[mark], varieties: [] };
      index.set(key, group);
      groups.push(group);
    }
    if (variety.variety && !group.varieties.includes(variety.variety)) group.varieties.push(variety.variety);
  }

  return groups;
}

function groupNames(varieties: VarietyPlan[]): NamedGroup[] {
  const groups: NamedGroup[] = [];
  const index = new Map<string, NamedGroup>();
  for (const variety of varieties) {
    let group = index.get(variety.crop);
    if (!group) {
      group = { crop: variety.crop, varieties: [] };
      index.set(variety.crop, group);
      groups.push(group);
    }
    if (variety.variety && !group.varieties.includes(variety.variety)) group.varieties.push(variety.variety);
  }
  return groups;
}

function groupCrops(varieties: VarietyPlan[]): { crop: string; varieties: VarietyPlan[] }[] {
  const order: string[] = [];
  const map = new Map<string, VarietyPlan[]>();
  for (const variety of varieties) {
    if (!map.has(variety.crop)) {
      map.set(variety.crop, []);
      order.push(variety.crop);
    }
    map.get(variety.crop)?.push(variety);
  }
  return order.map((crop) => ({ crop, varieties: map.get(crop) ?? [] }));
}

function cropId(crop: string, index: number): string {
  const slug = crop.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "crop";
  return `crop-${slug}-${index}`;
}

function columnIndex(header: string[], name: string, fallback: number): number {
  const found = header.findIndex((cell) => cell.trim().toLowerCase() === name);
  return found >= 0 ? found : fallback;
}

function monthColumns(header: string[]): { monthIndex: number; start: number; width: number }[] {
  const found: { monthIndex: number; start: number }[] = [];
  header.forEach((value, index) => {
    const monthIndex = MONTH_INDEX.get(value.trim().toLowerCase());
    if (monthIndex === undefined) return;
    if (found.some((month) => month.monthIndex === monthIndex)) return;
    found.push({ monthIndex, start: index });
  });

  if (found.length === 0) {
    return MONTHS.map((_, monthIndex) => {
      const start = 4 + monthIndex * 4;
      return { monthIndex, start, width: Math.max(0, Math.min(4, header.length - start)) };
    }).filter((span) => span.width > 0);
  }

  return found.map((month, index) => {
    const next = found[index + 1]?.start ?? header.length;
    return { ...month, width: Math.max(0, Math.min(4, next - month.start)) };
  });
}

function cell(row: string[], index: number): string {
  return (row[index] ?? "").trim().replace(/\s+/g, " ");
}

function rowHasMark(row: string[], spans: { start: number; width: number }[]): boolean {
  return spans.some((span) => {
    for (let week = 0; week < span.width; week += 1) {
      if (parseMark(row[span.start + week])) return true;
    }
    return false;
  });
}

function parseMark(value: string | undefined): WeekMark {
  if (!value) return null;
  const trimmed = value.trim().toUpperCase();
  if (!trimmed) return null;
  if (CODES.has(trimmed)) return trimmed as ActivityCode;
  for (const char of trimmed) {
    if (CODES.has(char)) return char as ActivityCode;
  }
  return null;
}
