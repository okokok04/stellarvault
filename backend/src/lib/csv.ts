/// Minimal CSV serializer — good enough for exporting our own typed
/// records, not a general-purpose library. Quotes any field containing
/// a comma, quote, or newline, doubling embedded quotes per RFC 4180.
function escapeCell(value: unknown): string {
  const str = value === null || value === undefined ? "" : String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function toCsv<T extends Record<string, unknown>>(
  rows: T[],
  columns: Array<keyof T>,
): string {
  const header = columns.join(",");
  const lines = rows.map((row) => columns.map((col) => escapeCell(row[col])).join(","));
  return [header, ...lines].join("\r\n");
}
