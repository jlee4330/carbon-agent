import {cat1Row,type Cat1Inputs} from './cat1Calculation';
import type {EmissionFactor,EmissionResult,FactorLink} from './factors';
import {type PurchaseGroup,type GroupDecision} from './grouping';
import type {Column,Mapping} from './shared';
export const DEMO_SOURCE={id:'demo-example',name:'동작 시연용 예시 계수',notice:'공식 한국 계수가 아닙니다. 실제 배출량 산정·보고에 사용할 수 없습니다.'} as const;
const spendFactors:EmissionFactor[]=[['cleaning','세척제 · 세정제 · 비누',0.00012],['resin','합성수지 · 플라스틱',0.0002],['steel','철강 · 철판',0.00018],['paper','종이 · 포장재',0.00008],['service','전문 서비스 · 컨설팅',0.00003]].map(([id,title,value])=>({id:`demo:${id}`,code:String(id),title:String(title),value:Number(value),withMargins:Number(value),basis:'spend',source:'demo-example',unit:'예시 kg CO₂e / KRW',year:2026,region:'DEMO',boundary:'demo-only'}));
export const DEMO_FACTORS:EmissionFactor[]=[...spendFactors,...spendFactors.filter(f=>f.code!=='service').map((f,index)=>({...f,id:`demo:weight:${f.code}`,basis:'weight' as const,value:[1.2,2,1.8,.8][index],withMargins:[1.2,2,1.8,.8][index],unit:'예시 kg CO₂e / kg'}))];
export function calculateDemo(groups:PurchaseGroup[],decisions:Record<string,GroupDecision>,links:Record<string,FactorLink>,columns:Column[],rows:string[][],mappings:Mapping[],blockedRows:Set<number>=new Set(),inputs:Record<string,Cat1Inputs>={},spendBlockedRows:Set<number>=new Set()):EmissionResult[]{
 return groups.flatMap(group=>group.rowIndices.map((index):EmissionResult=>{
  const base={dataRow:index+1,groupId:group.id,kgCO2e:null};const decision=decisions[group.id];
  if(!decision)return {...base,status:'unreviewed' as const,reason:'산정 방법 미확인'};
  if(decision.method==='hold')return {...base,status:'held' as const,reason:decision.note};
  if(blockedRows.has(index))return {...base,status:'conditions-required' as const,reason:'해당 거래의 산정 조건 미해결 · 계산 보류'};
  const check=cat1Row(rows[index],columns,mappings,inputs[group.id]);
  if(check.capital)return {...base,status:'held' as const,reason:'자본재 · Cat 2 검토 대상'};
  if(check.common.length)return {...base,status:'conditions-required' as const,reason:`공통 필수: ${check.common.join(' · ')}`};
  const factor=DEMO_FACTORS.find(f=>f.id===links[group.id]?.factor.id);
  const method=decision.method==='quantity'?'weight':decision.method==='spend'?'spend':null;
  if(!method||!factor||factor.basis!==method||!links[group.id]?.scopeConfirmed)return {...base,status:'factor-required' as const,reason:'산정 방식·단위에 맞는 계수 연결 필요'};
  if(method==='spend'&&spendBlockedRows.has(index))return {...base,status:'conditions-required' as const,reason:'금액 포함 범위 미확인 · 비용 기반 계산 보류'};
  const issues=method==='weight'?check.weightIssues:check.spendIssues;
  if(issues.length)return {...base,status:'basis-required' as const,reason:`${method==='weight'?'중량':'비용'} 기반: ${issues.join(' · ')} 확인 필요`};
  const value=method==='weight'?check.kg!:check.krw!;const kgCO2e=value*factor.value;
  if(!Number.isFinite(kgCO2e))return {...base,status:'invalid-amount' as const,reason:'활동량 범위 확인 필요'};
  return {...base,status:'calculated' as const,reason:`${method==='weight'?'중량':'비용'} 기반 시연용 예시 계산 · 실제 배출량 아님`,method,factorId:factor.id,activityValue:value,activityUnit:method==='weight'?'kg':'KRW',kgCO2e};
 })).sort((a,b)=>a.dataRow-b.dataRow);
}
