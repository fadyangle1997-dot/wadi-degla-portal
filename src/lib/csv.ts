/**
 * CSV that opens in Excel with Arabic intact: a UTF-8 BOM, every cell quoted,
 * CRLF rows. An empty cell (null) means «not yet», never zero.
 */
export type CsvCell = string | number | null;

export function toCsv(header: readonly string[], rows: readonly (readonly CsvCell[])[]): string {
  const cell = (v: CsvCell) => v === null ? '' : `"${String(v).replace(/"/g, '""')}"`;
  return ['﻿' + header.join(','), ...rows.map(r => r.map(cell).join(','))].join('\r\n');
}

/** Hands the CSV to the browser as a dated download: `<name>-YYYY-MM-DD.csv`. */
export function downloadCsv(name: string, csv: string): void {
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `${name}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoked after the click has been handed to the browser: revoking at
  // once cancels the download in Chromium.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
