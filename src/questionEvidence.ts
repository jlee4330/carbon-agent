import {fields,type Column,type Mapping} from './shared';
import type {ContextQuestion} from './reviewContext';
const dates=['date','receipt_date','invoice_date','order_date'];
const quantities=['order_quantity','order_unit','receipt_quantity','receipt_unit','invoice_quantity','invoice_unit','quantity','unit'];
const questionFields:Record<string,string[]>={
 coverage:dates,missing_scope:[...dates,'company','site'],missing_period:dates,missing_site:['company','site'],
 product_details:['code','item','description','specification','supplier'],product_reference:['code','item','description','specification','manufacturer'],
 code_consistency:['code','item','specification','supplier',...dates],
 repeated_rows:['order_id','line_id','id','receipt_id','item','receipt_date','receipt_quantity'],repeat_meaning:['order_id','line_id','id','receipt_id','item','receipt_date','receipt_quantity'],
 quantity_basis:quantities,quantity_difference:quantities,order_difference:['order_quantity','order_unit','receipt_quantity','receipt_unit'],invoice_difference:['receipt_quantity','receipt_unit','invoice_quantity','invoice_unit'],
 unit_meaning:['item',...quantities],unit_factor_details:['code','item','specification',...quantities],package_details:['code','item','specification',...quantities],
 amount_basis:['amount','currency','tax','discount','refund','additional_cost'],numeric_quality:['item',...quantities,'amount','currency','return_quantity','cancellation']
};
// Only unambiguous year-first calendar dates are summarized. No locale guessing.
function calendarDate(raw:string):string|null{
 const match=raw.trim().match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);if(!match)return null;
 const [,year,month,day]=match;const y=Number(year),m=Number(month),d=Number(day);const date=new Date(Date.UTC(y,m-1,d));
 return date.getUTCFullYear()===y&&date.getUTCMonth()===m-1&&date.getUTCDate()===d?`${year}-${month.padStart(2,'0')}-${day.padStart(2,'0')}`:null;
}
export function questionEvidence(question:ContextQuestion,columns:Column[],mappings:Mapping[],rows:string[][]){
 const requested=questionFields[question.id]??question.fields??(question.field?[question.field]:[]);
 return requested.flatMap(field=>{
  const mapping=mappings.find(m=>m.field===field),index=columns.findIndex(c=>c.id===mapping?.column);if(index<0)return [];
  const values=rows.map(row=>row[index]?.trim()??'');const examples=[...new Set(values.filter(Boolean))].slice(0,3);
  const isDate=dates.includes(field);const parsed=isDate?values.map(calendarDate).filter((v):v is string=>v!==null).sort():[];
  return [{field,column:columns[index].name,label:fields.find(f=>f[0]===field)?.[1]??mapping?.label??field,examples,isDate,range:parsed.length?`${parsed[0]} ~ ${parsed[parsed.length-1]}`:null,incomplete:isDate&&parsed.length!==values.length}];
 });
}
