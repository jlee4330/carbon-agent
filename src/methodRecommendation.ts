import type {ProductClassification} from './productClassification';
import {factorCandidates,validMoneyBasis,type EmissionFactor,type FactorLink,type MoneyBasis,type EmissionResult} from './factors';
import type {PurchaseGroup,GroupDecision,CalculationMethod} from './grouping';
export type MethodRecommendation={method:CalculationMethod|null;title:string;reason:string;issues:string[];candidates:EmissionFactor[];needsReview:boolean};
export function recommendMethod(group:PurchaseGroup,catalog:EmissionFactor[],link?:FactorLink,basis?:MoneyBasis,decision?:GroupDecision,results:EmissionResult[]=[],semantic?:ProductClassification):MethodRecommendation{
 const candidates=semantic?semantic.factorIds.flatMap(id=>catalog.find(f=>f.id===id)?[catalog.find(f=>f.id===id)!]:[]):factorCandidates(`${group.item} ${group.category}`,catalog);
 const method=decision?.method??(group.spendReady&&(link||candidates.length)?'spend':null);
 const issues:string[]=[];
 if(semantic?.status==='needs_input')issues.push(semantic.question||'제품의 의미를 확인해주세요.');
 if(semantic?.status==='no_match')issues.push(semantic.reason);
 if(decision?.method==='hold')return {method:'hold',title:'보류',reason:decision.note,issues:['보류 사유 확인'],candidates,needsReview:true};
 if(group.conflictingIdentity)issues.push('같은 코드의 제품명이 달라 제품 구분이 필요합니다.');
 if(group.negativeRows)issues.push('반품·정정일 수 있는 음수 거래가 있습니다.');
 if(group.invalidNumericRows)issues.push('숫자 형식이 불명확한 원본 값이 있습니다.');
 if(!catalog.length&&!link)issues.push('업계 평균 계수 데이터를 아직 불러오지 못했습니다.');
 if(method==='quantity'||method==='supplier')issues.push('선택한 방법의 계수 데이터 연결은 아직 지원하지 않습니다.');
 else if(!group.spendReady)issues.push('금액·통화가 부족합니다. 수량·공급업체 계수도 현재 지원되지 않아 방법을 확정할 수 없습니다.');
 else {
  if(!link){if(!candidates.length&&catalog.length)issues.push('제품에 맞는 계수를 찾지 못했습니다. 제품 설명 또는 구매 분류를 확인해주세요.');else if(candidates.length>1)issues.push('서로 다른 산업의 계수 후보가 있습니다. 제품 분류를 확인해주세요.');else if(candidates.length===1)issues.push('계수 후보를 찾았습니다. 해당 제품과 지역·산정 범위에 적용할 수 있는지 확인해주세요.');}
  if(!validMoneyBasis(basis,group.currency))issues.push(`${group.currency} 금액의 통화·기준연도 환산 기준을 한 번 확인해주세요.`);
 }
 if(results.some(row=>row.status==='conditions-required'))issues.push('이 거래에 적용할 공통 기준 또는 예외 확인이 남아 있습니다.');
 const calculated=results.length===group.rowIndices.length&&results.every(row=>row.status==='calculated');
 const reason=method==='spend'?'금액·통화가 있고 사용 가능한 금액 기준 계수 후보가 있어 구매금액 방식으로 제안합니다.':method?'사용자가 지정한 방법을 유지합니다.':'현재 자료와 지원 계수만으로 산정 방법을 확정할 수 없습니다.';
 return {method,title:calculated?'산정 완료':method==='spend'?'구매금액 방식 자동 제안':method?'지정한 방법 검토':'추가 정보 필요',reason,issues,candidates,needsReview:!calculated};
}
