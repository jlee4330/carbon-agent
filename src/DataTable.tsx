import { useState, type ReactNode } from 'react';
import type { Column } from './shared';

const ROW_HEIGHT = 40;
const VIEW_HEIGHT = 480;
const OVERSCAN = 8;

/** Keep every row scrollable without mounting the whole workbook in the DOM. */
export function DataTable({ columns, rows, columnIndices, label = "구매 자료 전체 데이터", renderHeader, headerHeight = ROW_HEIGHT, columnWidth = 180, showCaption = true }: { columns: Column[]; rows: string[][]; columnIndices?: number[]; label?: string; renderHeader?: (column: Column) => ReactNode; headerHeight?: number; columnWidth?: number; showCaption?: boolean }) {
 const [scrollTop, setScrollTop] = useState(0);
 const start = Math.max(0, Math.floor((scrollTop - headerHeight) / ROW_HEIGHT) - OVERSCAN);
 const end = Math.min(rows.length, Math.max(0, start) + Math.ceil(VIEW_HEIGHT / ROW_HEIGHT) + OVERSCAN * 2);
 return <div className="data-table-container">
  {showCaption && <div className="data-table-caption">전체 {rows.length.toLocaleString()}행 · 스크롤하여 마지막 행까지 확인할 수 있어요</div>}
  <div className={`table-wrap full-data-table ${renderHeader ? "editable-data-table" : ""}`} tabIndex={0} role="region" aria-label={label} onScroll={event => setScrollTop(event.currentTarget.scrollTop)}>
   <table aria-rowcount={rows.length + 1}>
    <colgroup><col style={{ width: 70 }}/>{columns.map(column => <col key={column.id} style={{ width: columnWidth }}/>)}</colgroup>
    <thead><tr aria-rowindex={1}><th scope="col">#</th>{columns.map(column => <th scope="col" key={column.id} style={{height:headerHeight}}>{renderHeader ? renderHeader(column) : column.name}</th>)}</tr></thead>
    <tbody>
     {start > 0 && <tr aria-hidden="true"><td className="table-spacer" colSpan={columns.length + 1} style={{ height: start * ROW_HEIGHT }}/></tr>}
     {rows.slice(start, end).map((row, offset) => <tr key={start + offset} aria-rowindex={start + offset + 2}><td className="row-number">{(start + offset + 1).toLocaleString()}</td>{columns.map((column, index) => {const value = row[columnIndices?.[index] ?? index] ?? '';return <td key={column.id} title={value}>{value || '—'}</td>;})}</tr>)}
     {end < rows.length && <tr aria-hidden="true"><td className="table-spacer" colSpan={columns.length + 1} style={{ height: (rows.length - end) * ROW_HEIGHT }}/></tr>}
    </tbody>
   </table>
  </div>
 </div>;
}
