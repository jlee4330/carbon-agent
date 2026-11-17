import type { Table } from './analysis.js';

/** Spread examples over the sheet, with fewer rows for unusually wide sheets. */
export function sampleTable(table: Table) {
 const limit = Math.max(3, Math.min(24, Math.floor(18000 / (Math.max(1, table.columns.length) * 80))));
 const count = Math.min(limit, table.rows.length);
 const indices = Array.from({ length: count }, (_, index) => count === 1 ? 0 : Math.round(index * (table.rows.length - 1) / (count - 1)));
 let truncatedCells = 0;
 const rows = indices.map(index => table.rows[index].map(value => {
  if (value.length <= 160) return value;
  truncatedCells++;
  return value.slice(0, 160) + '…';
 }));
 return { table: { ...table, rows }, rowNumbers: indices.map(index => index + 1), truncatedCells };
}
