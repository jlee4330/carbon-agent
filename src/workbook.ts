import * as XLSX from 'xlsx';
import type {Column,Mapping} from './shared';
export type SheetReview={name:string;header:number;rowCount:number;sampledRowCount?:number;analysisMode?:'sampled';chunkCount:number;mappings:Mapping[]};
export type ParsedWorkbook={SheetNames:string[];sheets:Record<string,string[][]>};
export function workbookTables(book:XLSX.WorkBook,headers:Record<string,number>){
 const parsed:ParsedWorkbook={SheetNames:book.SheetNames,sheets:{}};
 for(const name of book.SheetNames)parsed.sheets[name]=XLSX.utils.sheet_to_json<string[]>(book.Sheets[name],{header:1,defval:'',raw:false,blankrows:false});
 return parsedWorkbookTables(parsed,headers);
}
export function parsedWorkbookTables(book:ParsedWorkbook,headers:Record<string,number>,selectedSheet?:string){
 if(selectedSheet!==undefined&&!book.SheetNames.includes(selectedSheet))throw new Error('선택한 시트를 찾지 못했습니다.');
 const tables:{name:string;header:number;columns:Column[];rows:string[][]}[]=[];
 for(const name of selectedSheet===undefined?book.SheetNames:[selectedSheet]){
 const raw=book.sheets[name];
 if(!raw.length)continue;
 const detected=raw.slice(0,20).findIndex(r=>r.filter(c=>String(c).trim()).length>=3);
 const header=headers[name]??Math.max(detected,0);
 if(header>=raw.length)throw new Error(`${name}: 헤더 행을 확인해주세요.`);
 const width=raw.reduce((max,row)=>Math.max(max,row.length),0);
 const columns=Array.from({length:width},(_,i)=>({id:`c${i}`,name:String(raw[header][i]||`이름 없는 컬럼 ${i+1}`)}));
 const rows=raw.slice(header+1).filter(r=>r.some(c=>String(c).trim())).map(r=>columns.map((_,i)=>String(r[i]??'')));
 if(!rows.length)throw new Error(`${name}: 헤더 아래 데이터가 없습니다. 시트 내용을 확인해주세요. 빈 시트는 자동으로 제외됩니다.`);
 if(width>200)throw new Error(`${name}: 컬럼이 200개를 초과합니다. 분석할 수 있도록 자료를 정리해주세요.`);
 tables.push({name,header,columns,rows});
 }return tables;
}
