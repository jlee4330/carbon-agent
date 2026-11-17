import type {Column,Mapping} from './shared';
export function periodEvidence(columns:Column[],rows:string[][],mappings:Mapping[]){
 const field=['receipt_date','date','invoice_date','order_date'].find(field=>mappings.some(m=>m.field===field&&columns.some(c=>c.id===m.column)));
 if(!field)return null;
 const mapping=mappings.find(m=>m.field===field)!;const index=columns.findIndex(c=>c.id===mapping.column);
 const values=rows.map(row=>row[index]?.trim()??'');
 const slash=values.map(v=>v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/)).filter(v=>v!==null);
 const mdy=slash.some(v=>Number(v[2])>12),dmy=slash.some(v=>Number(v[1])>12);
 const format=mdy&&!dmy?'mdy':dmy&&!mdy?'dmy':null;
 function parse(value:string){
  const iso=value.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);const other=value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/);
  let y:number,m:number,d:number;
  if(iso){y=Number(iso[1]);m=Number(iso[2]);d=Number(iso[3]);}
  else if(other&&format){y=Number(other[3]);if(other[3].length===2)y+=2000;m=Number(other[format==='mdy'?1:2]);d=Number(other[format==='mdy'?2:1]);}
  else return null;
  const date=new Date(Date.UTC(y,m-1,d));if(date.getUTCFullYear()!==y||date.getUTCMonth()!==m-1||date.getUTCDate()!==d)return null;
  return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
 }
 const parsed=values.map(parse),valid=parsed.filter((v):v is string=>v!==null).sort();
 return {field,columnId:columns[index].id,column:columns[index].name,start:valid[0]??'',end:valid.at(-1)??'',complete:valid.length===values.length&&valid.length>0,twoDigitYear:slash.some(v=>v[3].length===2),examples:[...new Set(values.filter(Boolean))].slice(0,3)};
}
