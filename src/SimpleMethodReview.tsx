import {cat1Readiness,chooseCat1Method,type Cat1Inputs} from './cat1Calculation';
import {BatchProductMeaning} from './BatchProductMeaning';
import {useMemo,useState} from 'react';
import {ArrowLeft,ArrowRight} from 'lucide-react';
import {DataTable} from './DataTable';
import {DEMO_FACTORS,DEMO_SOURCE} from './demoFactors';
import {productKey} from './productClassification';
import {type FactorLink,type EmissionResult} from './factors';
import {assignMethod,type GroupDecision,type PurchaseGroup} from './grouping';
import type {Column,Mapping} from './shared';
import type {SemanticReview} from './useProductClassification';
type Props={mappings:Mapping[];inputs:Record<string,Cat1Inputs>;onInputs:(id:string,input:Cat1Inputs)=>void;groups:PurchaseGroup[];columns:Column[];rows:string[][];decisions:Record<string,GroupDecision>;links:Record<string,FactorLink>;results:EmissionResult[];semantic:SemanticReview;onLink:(id:string,link:FactorLink|null)=>void;onDecision:(id:string,decision:GroupDecision)=>void;onBack:()=>void;onComplete:()=>void};
export function SimpleMethodReview(props:Props){
 const [batchOpen,setBatchOpen]=useState(false);
 const [activeId,setActiveId]=useState(''),[query,setQuery]=useState(''),[all,setAll]=useState(false),[page,setPage]=useState(0);
 const done=useMemo(()=>{const statuses=new Map<string,boolean>();for(const result of props.results)statuses.set(result.groupId,(statuses.get(result.groupId)??true)&&result.status==='calculated');return statuses;},[props.results]);
 const filtered=props.groups.filter(group=>(all||!done.get(group.id))&&`${group.name} ${group.code}`.toLowerCase().includes(query.toLowerCase()));
 const pageCount=Math.max(1,Math.ceil(filtered.length/30)),safePage=Math.min(page,pageCount-1);
 const active=filtered.find(group=>group.id===activeId)??filtered[safePage*30];
 return <><div className="heading"><div className="eyebrow">03 · 산정 검토</div><h1>자료에 맞는 산정 방법을 확인해주세요</h1><p>중량 기반을 우선 검토하고, 필요한 자료가 부족하면 비용 기반을 검토합니다.</p></div><p className="demo-notice">시연 모드 · 예시 계수로 흐름을 확인합니다. 실제 배출량 산정·보고용이 아닙니다.</p>
 {props.semantic.error&&<p className="error" role="alert">품목 분류 연결 실패 <button className="text-button" onClick={props.semantic.onRetry}>다시 시도</button><small>{props.semantic.error}</small></p>}
 <div className="simple-review-toolbar"><input className="group-search" value={query} placeholder="품목 찾기" aria-label="품목 찾기" onChange={e=>{setQuery(e.target.value);setPage(0);}}/><button className="secondary" onClick={()=>setBatchOpen(!batchOpen)}>여러 품목 한 번에 설명</button><button className="text-button" onClick={()=>{setAll(!all);setPage(0);}}>{all?'확인할 품목만':'전체 품목 보기'}</button></div>
 {batchOpen&&<BatchProductMeaning groups={props.groups} meanings={props.semantic.meanings} onApply={props.semantic.onMeanings} onClose={()=>setBatchOpen(false)}/>}
 <div className="group-workspace"><aside className="purchase-group-list"><div className="group-list-scroll">{filtered.slice(safePage*30,safePage*30+30).map(group=>{const result=props.semantic.results[productKey(group)];return <button key={group.id} className={active?.id===group.id?'selected':''} onClick={()=>setActiveId(group.id)}><strong>{result?.productName||group.name}</strong><span>{group.rowIndices.length.toLocaleString()}건</span><small>{done.get(group.id)?'예시 계산 완료':props.decisions[group.id]?.method==='hold'?'나중에 확인':result?.status==='needs_input'?'제품 설명 필요':result?.status==='classified'?'산정 방법 · 제안 확인':props.semantic.loading?'분류 중':'분류 확인 필요'}</small></button>;})}{!filtered.length&&<p className="empty-groups">확인할 품목이 없습니다.</p>}</div>{pageCount>1&&<div className="group-pagination"><button disabled={!safePage} onClick={()=>setPage(safePage-1)}>이전</button><span>{safePage+1} / {pageCount}</span><button disabled={safePage===pageCount-1} onClick={()=>setPage(safePage+1)}>다음</button></div>}</aside><main className="group-editor">{active?<SimpleEditor key={active.id+JSON.stringify(props.links[active.id]??null)+(props.semantic.meanings[productKey(active)]??'')} {...props} group={active}/>:<p className="empty-groups">전체 품목 보기에서 적용한 내용을 다시 확인할 수 있습니다.</p>}</main></div>
 <div className="actions"><button className="text-button" onClick={props.onBack}><ArrowLeft size={16}/>자료 검토</button><button className="primary" onClick={props.onComplete}>시연 결과 보기<ArrowRight size={16}/></button></div></>;
}
function SimpleEditor({group,...props}:Props&{group:PurchaseGroup}){
 const id=productKey(group),classification=props.semantic.results[id],meaning=props.semantic.meanings[id]??'';
 const [text,setText]=useState(meaning),[manual,setManual]=useState(''),[edit,setEdit]=useState(false);
 const input=props.inputs[group.id]??{};
 const readiness=cat1Readiness(group,props.columns,props.rows,props.mappings,input);
 const families=new Set(DEMO_FACTORS.filter(f=>classification?.factorIds.includes(f.id)).map(f=>f.code));
 const candidates=DEMO_FACTORS.filter(f=>families.has(f.code));
 const available=candidates.flatMap(f=>f.basis?[f.basis]:[]);
 const method=chooseCat1Method(readiness,manual?DEMO_FACTORS.filter(f=>f.code===manual).flatMap(f=>f.basis?[f.basis]:[]):available);
 const matches=DEMO_FACTORS.filter(f=>f.basis===method&&(manual?f.code===manual:families.has(f.code)));
 const factor=matches.length===1?matches[0]:undefined;
 const needsInput=classification?.status==='needs_input';
 function apply(){if(!factor||!method)return;props.onLink(group.id,{factor,approvedAt:new Date().toISOString(),scopeConfirmed:true});props.onDecision(group.id,{method:method==='weight'?'quantity':'spend',confirmed:true,source:'manual',note:`템플릿 필수 정보 확인 · ${method==='weight'?'중량':'비용'} 기반 · 시연용 계수`});}
 const commonInputFields=[['purchase_type','구매 유형'],['major_category','대분류'],['material_composition','원재료 성분·비중'],['eeio_category','US EEIO 중분류'],['vat_included','VAT 포함 여부']] as const;
 return <><h2>{classification?.productName||group.name}</h2><p className="simple-review-subtitle">{group.code||'품목코드 없음'} · {group.rowIndices.length.toLocaleString()}개 거래</p>
 <div className="simple-method-label"><strong>{method?`제안 · ${method==='weight'?'중량':'비용'} 기반`:'산정에 필요한 정보 확인'}</strong><span>{method==='weight'?'입고중량(kg) × 중량 기반 배출계수':method==='spend'?'VAT를 제외한 원화 구매금액 × 비용 기반 배출계수':'자료와 계수의 준비 여부를 확인합니다.'}</span><small>{method==='spend'?(readiness.weightReady?'중량 자료는 있으나 연결 가능한 중량 계수가 없어 비용 기반을 검토합니다.':'중량 기반 자료가 부족해 비용 기반을 검토합니다.'):method==='weight'?'두 방법이 가능하면 중량 기반을 우선합니다.':''}</small></div>
 {readiness.capital&&<p className="error">자본재가 포함되어 있습니다. Cat 2로 분리해 검토해주세요.</p>}
 {readiness.common.length>0&&<p className="subtle-note">공통 필수 확인: {readiness.common.join(' · ')}</p>}
 <div className="cat1-method-readiness"><div><strong>중량 기반</strong><p>{readiness.weightIssues.length?readiness.weightIssues.join(' · ')+' 필요':'원재료 성분·입고중량·중량단위 확인됨'}</p></div><div><strong>비용 기반</strong><p>{readiness.spendIssues.length?readiness.spendIssues.join(' · ')+' 필요':'중분류·금액·통화·원화금액·VAT 기준 확인됨'}</p></div></div>
 <details className="group-rules"><summary>이 묶음의 공통 정보 입력·수정</summary><p>같은 기준을 적용할 수 있는 거래에만 입력해주세요. 비워두면 연결된 원본 값을 사용합니다.</p><div className="cat1-common-inputs">{commonInputFields.map(([field,label])=><label key={field}>{label}{field==='purchase_type'||field==='major_category'||field==='vat_included'?<select value={input[field]??''} onChange={e=>props.onInputs(group.id,{...input,[field]:e.target.value||undefined})}><option value="">원본 컬럼 사용</option>{(field==='purchase_type'?['일반 구매','자본재']:field==='major_category'?['원료 물질','부자재','포장재','상품','서비스','기타']:['포함','제외']).map(v=><option key={v}>{v}</option>)}</select>:<input value={input[field]??''} maxLength={1000} placeholder={field==='material_composition'?'예: 철 100% / 에탄올 70%, 물 30%':'확인한 US EEIO 분류'} onChange={e=>props.onInputs(group.id,{...input,[field]:e.target.value||undefined})}/>}</label>)}</div><p>입고중량·중량단위·원화금액 등 거래별 값은 컬럼 연결에서 보완해주세요. KRW 금액은 원화금액으로 사용할 수 있습니다. VAT 포함 금액은 별도 원화 세금 값이 있어야 제외 계산합니다.</p></details>
 {(needsInput||edit)&&<div className="simple-question"><h3>{classification?.question||'어떤 제품인지 알려주세요'}</h3><textarea className="simple-meaning-input" value={text} maxLength={2000} rows={3} onChange={e=>setText(e.target.value)} placeholder="실제 제품명·소재·용도"/><button className="primary" disabled={!text.trim()||text.trim()===meaning} onClick={()=>{props.semantic.onMeaning(id,text);setEdit(false);}}>설명 반영하기</button></div>}
 {!needsInput&&<section className="simple-proposal"><p>{classification?.reason||(props.semantic.loading?'제품 의미를 확인하고 있습니다.':'연결 가능한 계수를 확인해주세요.')}</p>{factor&&<p><strong>{factor.title}</strong><br/>{factor.value} {factor.unit}</p>}{families.size>1&&<label>제품 분류 확인<select value={manual} onChange={e=>setManual(e.target.value)}><option value="">선택해주세요</option>{[...families].map(code=><option key={code} value={code}>{DEMO_FACTORS.find(f=>f.code===code)?.title}</option>)}</select></label>}<button className="primary" disabled={!factor||!method} onClick={apply}>이 묶음에 제안 적용</button><button className="text-button" onClick={()=>setEdit(!edit)}>제품 설명 수정</button></section>}
 <details className="group-rules"><summary>예시 분류로 직접 시연하기</summary><p>필수 정보가 준비된 방법만 적용할 수 있습니다. 계수는 실제 보고에 사용할 수 없는 예시입니다.</p><select aria-label="시연용 예시 분류" value={manual} onChange={e=>setManual(e.target.value)}><option value="">예시 선택</option>{DEMO_FACTORS.filter(f=>f.basis==='spend').map(f=><option value={f.code} key={f.id}>{f.title}</option>)}</select><button className="secondary" disabled={!factor||!method} onClick={apply}>선택한 예시 적용</button></details>
 <button className="text-button" onClick={()=>props.onDecision(group.id,assignMethod(group,'hold','사용자가 나중에 확인하기로 선택'))}>나중에 확인</button>
 <details className="group-rules"><summary>원본 거래 보기</summary><DataTable columns={[{id:'__row__',name:'원본 데이터 행'},...props.columns]} rows={group.rowIndices.map(index=>[String(index+1),...props.rows[index]])}/></details></>;
}
export function DemoResults({results,onBack,onDownload}:{results:EmissionResult[];onBack:()=>void;onDownload:()=>void}){
 const calculated=results.filter(r=>r.status==='calculated'),total=calculated.reduce((sum,r)=>sum+(r.kgCO2e??0),0);
 return <><div className="heading"><div className="eyebrow">04 · 시연 결과</div><h1>제안을 적용한 결과입니다</h1><p>{DEMO_SOURCE.notice}</p></div><div className="demo-result-total"><span>예시 계산값</span><strong>{total.toLocaleString(undefined,{maximumFractionDigits:2})}<small> kg CO₂e</small></strong><p>{calculated.length.toLocaleString()}건 예시 계산 · {(results.length-calculated.length).toLocaleString()}건 미적용</p></div><details className="group-rules"><summary>거래별 결과 확인</summary><DataTable columns={[{id:'row',name:'원본 데이터 행'},{id:'method',name:'산정 방법'},{id:'activity',name:'활동량'},{id:'value',name:'예시 kg CO₂e'},{id:'reason',name:'상태'}]} rows={results.map(r=>[String(r.dataRow),r.method==='weight'?'중량 기반':r.method==='spend'?'비용 기반':'미산정',r.activityValue===undefined?'—':`${r.activityValue} ${r.activityUnit}`,r.kgCO2e===null?'미적용':String(r.kgCO2e),r.reason])}/></details><div className="actions"><button className="text-button" onClick={onBack}>품목 검토로 돌아가기</button><button className="primary" onClick={onDownload}>시연 결과 다운로드</button></div></>;
}
