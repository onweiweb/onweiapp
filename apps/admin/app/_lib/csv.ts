/**
 * One CSV cell: always quoted, inner quotes doubled, and spreadsheet
 * formulas (=, +, -, @) neutralised so an opened file can't run anything.
 */
export function csvCell(value: string | number | null | undefined): string {
  const text = value == null ? "" : String(value);
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

/** Rows to a CSV file body with a BOM, so Excel reads it as UTF-8. */
export function toCsv(rows: (string | number | null | undefined)[][]): string {
  return `﻿${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
}
