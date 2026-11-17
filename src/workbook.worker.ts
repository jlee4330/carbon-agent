import * as XLSX from 'xlsx';
import type { ParsedWorkbook } from './workbook';
self.onmessage = async (event: MessageEvent<File>) => {
 try {
  const data = await event.data.arrayBuffer();
  const book = XLSX.read(data, { type: 'array', cellDates: true });
  const parsed: ParsedWorkbook = { SheetNames: book.SheetNames, sheets: {} };
  for (const name of book.SheetNames) {
   parsed.sheets[name] = XLSX.utils.sheet_to_json<string[]>(book.Sheets[name], { header: 1, defval: '', raw: false, blankrows: false });
  }
  self.postMessage({ book: parsed });
 } catch {
  self.postMessage({ error: '파일을 읽지 못했습니다. 올바른 Excel 또는 CSV 파일인지 확인해주세요.' });
 }
};
