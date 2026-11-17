import {readApiJson} from './apiResponse';
import {splitIdentityScreening} from './identityScreening';
import {useEffect,useMemo,useState} from 'react';
import {Upload,Layers} from 'lucide-react';
import {mergeProductInputs,productInput,type ProductInput} from './productClassification';
import type {PurchaseGroup} from './grouping';
import type {Column,Mapping} from './shared';
import {buildContextAnswer,type ContextQuestion,type ReviewAnswer} from './reviewContext';
type IdentityGroup={label:string;ids:string[];needsDetails:boolean};
const cache=new Map<string,IdentityGroup[]>();
export function ProductIdentityReview({groups,columns,rows,mappings,meanings,onMeanings,question,onNext}:{groups:PurchaseGroup[];columns:Column[];rows:string[][];mappings:Mapping[];meanings:Record<string,string>;onMeanings:(ids:string[],text:string)=>void;question:ContextQuestion;onNext:(answer:ReviewAnswer)=>void}){
 const products=useMemo(()=>mergeProductInputs(groups.map(group=>productInput(group,columns,rows,mappings,''))),[groups,columns,rows,mappings]);
 const immediate=useMemo(()=>splitIdentityScreening(products).immediate,[products]);
 const signature=JSON.stringify(products);const [review,setReview]=useState<IdentityGroup[]>([]),[busy,setBusy]=useState(true),[error,setError]=useState(''),[manual,setManual]=useState(false),[retry,setRetry]=useState(0);
 useEffect(()=>{let alive=true;const controller=new AbortController();setBusy(true);setError('');
 const inputs:ProductInput[]=JSON.parse(signature);const {immediate,remaining}=splitIdentityScreening(inputs);setReview(immediate);const batches=Array.from({length:Math.ceil(remaining.length/20)},(_,i)=>remaining.slice(i*20,i*20+20));
 (async()=>{try{const results:IdentityGroup[][]=Array(batches.length);let cursor=0;await Promise.all(Array.from({length:Math.min(3,batches.length)},async()=>{while(cursor<batches.length){const index=cursor++,batch=batches[index],key=JSON.stringify(batch);if(cache.has(key)){results[index]=cache.get(key)!;if(alive)setReview([...immediate,...results.flat()]);continue;}const response=await fetch('/api/product-identities',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({products:batch}),signal:controller.signal});const data=await readApiJson(response);if(!response.ok)throw new Error(data.error||'품목 검사 실패');cache.set(key,data.groups);results[index]=data.groups;if(alive)setReview([...immediate,...results.flat()]);}}));if(alive)setReview([...immediate,...results.flat()]);}catch(e){controller.abort();if(alive){setError(e instanceof Error?e.message:'품목 검사 실패');setReview([...immediate,...remaining.map(p=>({label:p.name||p.code||'이름 없는 품목',ids:[p.id],needsDetails:true}))]);}}finally{if(alive)setBusy(false);}})();return()=>{alive=false;controller.abort();};},[signature,retry]);
 const visible=review.length?review:immediate;
 const pending=visible.filter(group=>group.needsDetails).map(group=>({...group,ids:group.ids.filter(id=>!meanings[id]?.trim())})).filter(group=>group.ids.length);
 const merged=useMemo(()=>{const map=new Map<string,IdentityGroup>();for(const group of pending){const existing=map.get(group.label);map.set(group.label,{...group,ids:[...(existing?.ids??[]),...group.ids]});}return [...map.values()];},[pending]);
 const choose=(choice:string)=>onNext(buildContextAnswer(question,choice,''));
 return <section className="product-identity-review"><div className="review-task-heading"><h3>{immediate.some(g=>g.label!=='품목명 누락')?'자료에 코드·약어로 표시된 품목이 있습니다':pending.length?'실제 제품 정보가 필요한 품목이 있습니다':busy?'품목 정보를 확인하고 있습니다':'품목 정보를 확인했습니다'}</h3><p>품목대장이 있으면 업로드하고, 없으면 묶음별 제품명과 사양을 알려주세요.</p></div>
 <div className="identity-actions"><button className="choice-card" onClick={()=>choose('master')}><Upload size={28}/><strong>품목대장 업로드</strong><p>품목코드 · 실제 제품명 · 규격·사양</p></button><button className={'choice-card'+(manual?' selected':'')} onClick={()=>setManual(!manual)}><Layers size={28}/><strong>품목대장 없이 입력</strong><p>코드·약어 묶음별로 공통 설명</p></button></div>
 {busy&&<p role="status" className="subtle-note">추가 확인이 필요한 품목을 검사 중입니다. 표시된 묶음은 먼저 확인할 수 있어요.</p>}
 {error&&<p role="alert" className="subtle-note">{error} 검사를 완료하지 못한 품목은 원본 이름으로 표시합니다. <button className="text-button" onClick={()=>setRetry(v=>v+1)}>다시 검사</button></p>}
 <div className="identity-groups">{merged.map(group=><IdentityCard key={JSON.stringify(group.ids)} group={group} products={products} manual={manual} onApply={text=>onMeanings(group.ids,text)}/>)}</div>
 {!busy&&!pending.length&&<p className="subtle-note">추가 설명이 필요한 품목이 없습니다.</p>}
 <div className="actions"><button className="text-button" onClick={()=>choose('unknown')}>나중에 확인</button><button className="primary" disabled={busy||pending.length>0||Boolean(error)} onClick={()=>choose('sufficient')}>제품 정보 확인하고 계속</button></div></section>;
}
function IdentityCard({group,products,manual,onApply}:{group:IdentityGroup;products:ProductInput[];manual:boolean;onApply:(text:string)=>void}){
 const [text,setText]=useState('');const ids=new Set(group.ids);const items=products.filter(p=>ids.has(p.id));
 return <details className="identity-group" open={manual||undefined}><summary><strong>{group.label}</strong><span>{items.length}개 품목</span></summary><div className="identity-code-list">{items.map(p=><span key={p.id}><strong>{p.name||p.code||'품목명 없음'}</strong><small>{[p.code,p.supplier,...p.details].filter(Boolean).join(' · ')}</small></span>)}</div>{manual&&<div className="identity-description"><label>실제 제품명 · 사양<textarea value={text} maxLength={2000} rows={3} onChange={e=>setText(e.target.value)} placeholder="예: 설비용 알칼리 세정제. 세부 농도는 제품별로 다름"/></label><button className="secondary" disabled={!text.trim()} onClick={()=>onApply(text.trim())}>이 묶음에 설명 반영</button></div>}</details>;
}
