import type {Column,Mapping} from './shared';
export type CalculationMethod='supplier'|'quantity'|'spend'|'hold';
export type GroupRule={id:string;column:string;operator:'equals'|'contains';value:string;label:string};
export type GroupDecision={method:CalculationMethod;confirmed:true;note:string;source?:'manual'|'bulk'|'rule';ruleId?:string};
export type PurchaseGroup={id:string;name:string;code:string;item:string;category:string;identified:boolean;conflictingIdentity:boolean;invalidNumericRows:number;supplier:string;unit:string;currency:string;rowIndices:number[];ruleId?:string;reason:string;quantityReady:boolean;spendReady:boolean;negativeRows:number};
export const methodNames:Record<CalculationMethod,string>={supplier:'공급업체 자료',quantity:'구매량 자료',spend:'구매금액 자료',hold:'보류'};
function exact(value:string){return value.normalize('NFKC').trim().replace(/\s+/g,' ');}
export function normalize(value:string){return value.normalize('NFKC').trim().replace(/\s+/g,' ').toLocaleLowerCase();}
export function numericValue(value:string):number|null{
 const text=value.trim();if(!text)return null;
 // Reject ambiguous punctuation, currency symbols and units instead of guessing conversions.
 if(!/^[+-]?(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?$/.test(text))return null;
 const number=Number(text.replace(/,/g,''));return Number.isFinite(number)?number:null;
}
export function groupPurchases(columns:Column[],rows:string[][],mappings:Mapping[],rules:GroupRule[]):PurchaseGroup[]{
 const indices=new Map(mappings.map(mapping=>[mapping.field,columns.findIndex(column=>column.id===mapping.column)]));
 const ruleIndices=rules.map(rule=>({...rule,index:columns.findIndex(column=>column.id===rule.column),match:normalize(rule.value)}));
 const groups=new Map<string,PurchaseGroup>();
 const codeNames=new Map<string,Set<string>>();
 rows.forEach((row,rowIndex)=>{
  const value=(field:string)=>row[indices.get(field)??-1]??'';
  const item=value('item'),code=value('code'),supplier=value('supplier'),unit=value('unit'),currency=value('currency');
  if(code.trim()&&item.trim()){const key=exact(code);const names=codeNames.get(key)??new Set<string>();names.add(exact(item));codeNames.set(key,names);}
  const rule=ruleIndices.find(rule=>{if(!rule.match)return false;const text=normalize(rule.column==='__row__'?String(rowIndex+1):row[rule.index]??'');return rule.operator==='equals'?text===rule.match:text.includes(rule.match);});
  const identity=rule?['rule',rule.id]:code||item?['auto',exact(code),exact(item),exact(supplier),exact(value('category'))]:['row',rowIndex];
  const id=JSON.stringify([...identity,exact(unit),exact(currency)]);
  let group=groups.get(id);
  if(!group){group={id,name:rule?.label||item||code||`미식별 거래 ${rowIndex+1}`,code,item,category:value('category'),identified:Boolean(code.trim()||item.trim()),conflictingIdentity:false,invalidNumericRows:0,supplier:rule?'규칙 적용':supplier,unit,currency,rowIndices:[],ruleId:rule?.id,reason:rule?`사용자 규칙: ${rule.label} · 단위·통화별 분리`:code||item?'품목코드·품목명·공급업체·분류가 같고 단위·통화가 같은 거래':'품목을 식별할 수 없어 개별 거래로 유지',quantityReady:true,spendReady:true,negativeRows:0};groups.set(id,group);}
  group.rowIndices.push(rowIndex);
  const quantity=numericValue(value('quantity')),amount=numericValue(value('amount'));
  if((value('quantity').trim()&&quantity===null)||(value('amount').trim()&&amount===null))group.invalidNumericRows++;
  group.quantityReady&&=quantity!==null&&Boolean(unit.trim());
  group.spendReady&&=amount!==null&&Boolean(currency.trim());
  if((quantity!==null&&quantity<0)||(amount!==null&&amount<0))group.negativeRows++;
 });
 for(const group of groups.values())group.conflictingIdentity=Boolean(group.code.trim()&&(codeNames.get(exact(group.code))?.size??0)>1);
 return [...groups.values()];
}
export function methodAvailable(group:PurchaseGroup,method:CalculationMethod){return method==='hold'||(method==='supplier'||method==='quantity'?group.quantityReady:group.spendReady);}
export function assignMethod(group:PurchaseGroup,method:CalculationMethod,note:string):GroupDecision{
 if(!methodAvailable(group,method))throw new Error('이 방법에 필요한 수량·단위 또는 금액·통화를 먼저 확인해주세요.');
 if(method==='hold'&&!note.trim())throw new Error('보류 사유를 입력해주세요.');
 return {method,confirmed:true,note:note.trim(),source:'manual'};
}
export function transactionAssignments(groups:PurchaseGroup[],decisions:Record<string,GroupDecision>){
 return groups.flatMap(group=>group.rowIndices.map(index=>({dataRow:index+1,groupId:group.id,method:decisions[group.id]?.method??null,groupConfirmed:Boolean(decisions[group.id]?.confirmed),note:decisions[group.id]?.note??'',decisionSource:decisions[group.id]?.source??null,approvalRuleId:decisions[group.id]?.ruleId??null,status:!decisions[group.id]?'unreviewed':decisions[group.id].method==='hold'?'held':'factor-required'}))).sort((a,b)=>a.dataRow-b.dataRow);
}
