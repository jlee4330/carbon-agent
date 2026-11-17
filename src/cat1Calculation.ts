import {numericValue,type PurchaseGroup} from './grouping';
import type {Column,Mapping} from './shared';
export type Cat1Basis='weight'|'spend';
export type Cat1Inputs=Partial<Record<'purchase_type'|'major_category'|'material_composition'|'eeio_category'|'vat_included',string>>;
export function cat1Row(row:string[],columns:Column[],mappings:Mapping[],input:Cat1Inputs={}){
 const get=(field:string)=>{const override=input[field as keyof Cat1Inputs];return (override??row?.[columns.findIndex(c=>c.id===mappings.find(m=>m.field===field)?.column)]??'').trim();};
 const common:string[]=[];
 for(const [field,label] of [['receipt_date','입고일자'],['item','구매품목명'],['purchase_type','구매 유형'],['major_category','대분류']])if(!get(field))common.push(label);
 const capital=/^(자본재|capital goods)$/i.test(get('purchase_type'));
 if(get('purchase_type')&&!capital&&!/^(일반 구매|일반구매|ordinary purchase)$/i.test(get('purchase_type')))common.push('구매 유형 구분');
 if(get('major_category')&&!['원료 물질','부자재','포장재','상품','서비스','기타'].includes(get('major_category')))common.push('대분류 구분');
 const weightIssues:string[]=[];
 if(!get('material_composition'))weightIssues.push('원재료 성분·비중');
 const weight=numericValue(get('receipt_weight'));if(weight===null||weight<0)weightIssues.push('입고중량');
 const scales:Record<string,number>={kg:1,'㎏':1,'킬로그램':1,g:.001,t:1000,ton:1000,tonne:1000};const scale=scales[get('weight_unit').toLowerCase()];if(scale===undefined)weightIssues.push('중량단위(kg·g·t)');
 const kg=weight!==null&&scale!==undefined?weight*scale:null;if(kg!==null&&!Number.isFinite(kg))weightIssues.push('입고중량 범위');
 const spendIssues:string[]=[];if(!get('eeio_category'))spendIssues.push('US EEIO 중분류');
 const amount=numericValue(get('amount'));if(amount===null||amount<0)spendIssues.push('구매금액');const currency=get('currency').toUpperCase();if(!currency)spendIssues.push('통화단위');
 const explicitKRW=get('amount_krw');let krw=explicitKRW?numericValue(explicitKRW):currency==='KRW'?amount:null;
 if(krw===null||krw<0)spendIssues.push('원화 기준 구매금액');
 const vat=get('vat_included').toLowerCase();const included=['포함','yes','y','true','1','vat 포함'].includes(vat),excluded=['미포함','제외','no','n','false','0','vat 제외'].includes(vat);
 if(!included&&!excluded)spendIssues.push('VAT 포함 여부');
 if(included){const tax=currency==='KRW'?numericValue(get('tax')):null;if(tax===null||tax<0||krw===null||tax>krw)spendIssues.push('원화 VAT 금액(제외 계산용)');else krw-=tax;}
 return {common,capital,weightIssues,spendIssues,kg,krw};
}
export function cat1Readiness(group:PurchaseGroup,columns:Column[],rows:string[][],mappings:Mapping[],input:Cat1Inputs={}){
 const checks=group.rowIndices.map(i=>cat1Row(rows[i],columns,mappings,input));
 const common=[...new Set(checks.flatMap(c=>c.common))],weightIssues=[...new Set(checks.flatMap(c=>c.weightIssues))],spendIssues=[...new Set(checks.flatMap(c=>c.spendIssues))];
 const distinct=(field:string)=>new Set(group.rowIndices.map(i=>rows[i]?.[columns.findIndex(c=>c.id===mappings.find(m=>m.field===field)?.column)]?.trim()).filter(Boolean)).size;
 if(!input.material_composition&&distinct('material_composition')>1)weightIssues.push('서로 다른 성분·비중: 묶음 분리 또는 공통 구성 확인');
 if(!input.eeio_category&&distinct('eeio_category')>1)spendIssues.push('서로 다른 US EEIO 중분류: 묶음 분리 또는 공통 분류 확인');
 const capital=checks.some(c=>c.capital);const base=checks.length>0&&!common.length&&!capital;
 return {common,weightIssues,spendIssues,capital,weightReady:base&&!weightIssues.length,spendReady:base&&!spendIssues.length};
}
export function chooseCat1Method(readiness:ReturnType<typeof cat1Readiness>,available:Cat1Basis[]):Cat1Basis|null{
 if(readiness.weightReady&&available.includes('weight'))return 'weight';
 if(readiness.spendReady&&available.includes('spend'))return 'spend';
 return null;
}
