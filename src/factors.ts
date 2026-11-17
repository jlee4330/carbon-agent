import {numericValue,type PurchaseGroup,type GroupDecision} from './grouping';
import type {Column,Mapping} from './shared';
export const EPA_SOURCE={id:'epa-scef-1.3.0',name:'US EPA Supply Chain GHG Factors v1.3.0',year:2022,region:'미국',unit:'kg CO₂e / 2022 USD',url:'https://catalog.data.gov/dataset/supply-chain-greenhouse-gas-emission-factors-v1-3-by-naics-6',download:'https://pasteur.epa.gov/uploads/10.23719/1531143/SupplyChainGHGEmissionFactors_v1.3.0_NAICS_CO2e_USD2022.csv'} as const;
export type EmissionFactor={basis?:'weight'|'spend';id:string;code:string;title:string;value:number;withMargins:number;source:typeof EPA_SOURCE.id|'demo-example';unit:string;year:number;region:'US'|'DEMO';boundary:'cradle-to-production'|'demo-only';};
export type MoneyBasis={currency:string;purchaseYear:number;usdPerCurrency:number;priceAdjustment:number;evidence:string;confirmed:boolean};
export type FactorLink={factor:EmissionFactor;approvedAt:string;scopeConfirmed:true;};
export type EmissionResult={dataRow:number;groupId:string;status:'calculated'|'held'|'unreviewed'|'factor-required'|'basis-required'|'conditions-required'|'invalid-amount';kgCO2e:number|null;reason:string;factorId?:string;method?:'weight'|'spend';activityValue?:number;activityUnit?:string;amount?:number;normalizedUSD2022?:number};
const aliases:[RegExp,string[]][]=[[/세척제|세정제|비누|detergent|soap/i,['soap','cleaning']], [/알루미늄|aluminium|aluminum/i,['aluminum']], [/철강|철판|강판|steel/i,['steel']], [/시멘트|cement/i,['cement']], [/플라스틱|수지|plastic|resin/i,['plastic','resin']], [/종이|인쇄용지|paper/i,['paper']], [/컴퓨터|computer/i,['computer']], [/소프트웨어|software/i,['software']], [/회계|accounting/i,['accounting']], [/법률|legal/i,['legal']], [/컨설팅|consulting/i,['consulting']], [/고무|rubber/i,['rubber']], [/유리|glass/i,['glass']], [/비료|fertilizer/i,['fertilizer']], [/페인트|도료|paint/i,['paint']]];
export function factorCandidates(text:string,catalog:EmissionFactor[],limit=8):EmissionFactor[]{
 const query=text.trim().toLowerCase();if(!query)return [];
 const tokens=query.split(/[^a-z0-9]+/).filter(t=>t.length>2&&!/^\d+$/.test(t));
 const words=[...tokens,...aliases.filter(([pattern])=>pattern.test(query)).flatMap(([,terms])=>terms)];
 return catalog.map(f=>({f,score:f.code===query?100:words.reduce((score,word)=>score+(new RegExp(`\\b${word}\\b`,'i').test(f.title)?1:0),0)})).filter(entry=>entry.score>0).sort((a,b)=>b.score-a.score||a.f.code.localeCompare(b.f.code)).slice(0,limit).map(entry=>entry.f);
}
export function validMoneyBasis(basis:MoneyBasis|undefined,currency:string):basis is MoneyBasis{return Boolean(basis?.confirmed&&basis.currency===currency&&Number.isInteger(basis.purchaseYear)&&basis.purchaseYear>=1900&&basis.purchaseYear<=2100&&Number.isFinite(basis.usdPerCurrency)&&basis.usdPerCurrency>0&&Number.isFinite(basis.priceAdjustment)&&basis.priceAdjustment>0&&basis.evidence.trim()&&(currency!=='USD'||basis.usdPerCurrency===1)&&(basis.purchaseYear!==2022||basis.priceAdjustment===1));}
export function calculateEmissions(groups:PurchaseGroup[],decisions:Record<string,GroupDecision>,links:Record<string,FactorLink>,bases:Record<string,MoneyBasis>,columns:Column[],rows:string[][],mappings:Mapping[],blockedRows:Set<number>=new Set()):EmissionResult[]{
 const amountIndex=columns.findIndex(c=>c.id===mappings.find(m=>m.field==='amount')?.column);
 return groups.flatMap(group=>group.rowIndices.map(index=>{
  const base={dataRow:index+1,groupId:group.id,kgCO2e:null};const decision=decisions[group.id],link=links[group.id];
  if(!decision)return {...base,status:'unreviewed' as const,reason:'산정 방법 미확인'};
  if(decision.method==='hold')return {...base,status:'held' as const,reason:decision.note};
  if(decision.method!=='spend'||!link)return {...base,status:'factor-required' as const,reason:decision.method==='spend'?'업계 평균 계수 연결 필요':'이 방법의 계수 데이터는 아직 지원하지 않습니다.'};
  if(!link.scopeConfirmed||link.factor.source!==EPA_SOURCE.id||link.factor.year!==2022||link.factor.boundary!=='cradle-to-production'||!Number.isFinite(link.factor.value)||link.factor.value<0)return {...base,status:'factor-required' as const,reason:'계수의 출처·범위 확인 필요'};
  if(blockedRows.has(index))return {...base,status:'conditions-required' as const,reason:'해당 거래의 산정 조건 미확인'};
  const basis=bases[group.currency];if(!validMoneyBasis(basis,group.currency))return {...base,status:'basis-required' as const,reason:`${group.currency} → 2022 USD 환산 기준 확인 필요`};
  const amount=numericValue(rows[index]?.[amountIndex]??'');if(amount===null||amount<0)return {...base,status:'invalid-amount' as const,reason:'금액 누락·형식·반품 처리 확인 필요'};
  const normalizedUSD2022=amount*basis.usdPerCurrency*basis.priceAdjustment,kgCO2e=normalizedUSD2022*link.factor.value;
  if(!Number.isFinite(kgCO2e))return {...base,status:'invalid-amount' as const,reason:'계산 가능 범위를 벗어난 금액'};
  return {...base,status:'calculated' as const,reason:'승인한 미국 업계 평균 계수로 추정',factorId:link.factor.id,amount,normalizedUSD2022,kgCO2e};
 })).sort((a,b)=>a.dataRow-b.dataRow);
}

export function matchingUnreviewedGroups(group:PurchaseGroup,groups:PurchaseGroup[],decisions:Record<string,GroupDecision>):PurchaseGroup[]{
 if(group.ruleId||group.conflictingIdentity||!group.item.trim())return [];
 return groups.filter(candidate=>!decisions[candidate.id]&&!candidate.ruleId&&!candidate.conflictingIdentity&&candidate.spendReady&&candidate.code.trim()===group.code.trim()&&candidate.item.trim()===group.item.trim()&&candidate.category.trim()===group.category.trim());
}
