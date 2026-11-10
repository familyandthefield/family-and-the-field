import sheet from "./season-sheet.json";

/** Public garden plan. Change the sheet id or gid here only. */
export const seasonSheet = {
  spreadsheetId: sheet.spreadsheetId,
  gid: sheet.gid,
} as const;

export function seasonSheetCsvUrl(
  source: { spreadsheetId: string; gid: string } = seasonSheet,
): string {
  const spreadsheetId = encodeURIComponent(source.spreadsheetId);
  const gid = encodeURIComponent(source.gid);
  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`;
}
