/** Escapes a single CSV field per RFC 4180 (quotes, commas, and newlines). */
function escapeCsvField(value) {
  const s = value === null || value === undefined ? '' : String(value);
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/**
 * Converts an array of records to a CSV string using an explicit column list,
 * so each caller controls exactly which (flat, scalar) fields become
 * spreadsheet columns — nested arrays/objects need a `get` to flatten them.
 *
 * @param {Array<object>} records
 * @param {Array<{ key: string, label: string, get?: (record: object) => unknown }>} columns
 * @returns {string} CSV text with CRLF line endings
 */
export function toCSV(records, columns) {
  const header = columns.map(c => escapeCsvField(c.label)).join(',');
  const rows = records.map(record =>
    columns.map(c => escapeCsvField(c.get ? c.get(record) : record[c.key])).join(','),
  );
  return [header, ...rows].join('\r\n');
}
