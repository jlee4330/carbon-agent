import { useState } from 'react';
import { ArrowRight, ArrowLeft, RotateCcw, Check, X, Info, CheckCircle2 } from 'lucide-react';
import { screeningQuestions, screeningSession } from './screening';

export function ScreeningHome({names,answers,onAnswers,onStart}:{names:string[];answers:boolean[];onAnswers:(answers:boolean[])=>void;onStart:()=>void}){
 const [started,setStarted]=useState(answers.length>0);
 const session=screeningSession(answers);
 const current=session.current?screeningQuestions[session.current]:null;
 const [selection,setSelection]=useState<{id:string;value:boolean}|null>(null);
 const selected=selection?.id===session.current?selection.value:null;
 function move(next:boolean[]){setSelection(null);onAnswers(next);window.scrollTo(0,0);}
 if(!started)return <section className="flow screening-welcome"><div className="eyebrow">SCOPE 3 · CARBON AGENT</div><h1>Scope 3 탄소배출<br/>산정 범위 확인하기</h1><p className="screening-welcome-description">회사의 구매·운송·제품·자산 활동을 살펴보고<br/>산정할 카테고리를 함께 확인합니다.</p><div className="screening-welcome-path" aria-label="진행 순서"><span>회사 활동 확인</span><ArrowRight size={17}/><span>산정 항목 확인</span><ArrowRight size={17}/><span>자료 검토</span></div><button className="primary screening-welcome-start" onClick={()=>{setStarted(true);window.scrollTo(0,0);}}>시작하기<ArrowRight size={18}/></button><p className="screening-welcome-note">답변에 따라 필요한 질문만 이어집니다.</p></section>;
 return <section className="flow screening-flow">
  {current?<>
   <div className="heading"><div className="eyebrow">SCOPE 3 · {current.group}</div><h1>{current.text}</h1><p>{current.hint}</p></div>
   <div className="screening-choice-grid" role="group" aria-label="질문 답변">{[true,false].map(value=>{
    const Icon=value?Check:X;
    return <button key={String(value)} className={`choice-card screening-choice ${selected===value?'selected':''}`} aria-pressed={selected===value} onClick={()=>setSelection({id:session.current!,value})}><span className="choice-check">{selected===value&&<Check size={14}/>}</span><Icon size={30} strokeWidth={1.5}/><strong>{value?'예':'아니요'}</strong><p>{value?'해당하는 활동이 있어요':'해당하지 않아요'}</p></button>;
   })}</div>
   <div className="help-box"><Info size={18}/><div><strong>회사 활동을 기준으로 산정 범위를 확인합니다.</strong><p>답변에 따라 필요한 질문만 이어집니다. 이전 단계로 돌아가 답변을 바꿀 수 있어요.</p></div></div>
   <div className="actions"><button className="text-button" onClick={()=>{if(answers.length)move(answers.slice(0,-1));else setStarted(false);}}><ArrowLeft size={16}/>이전</button><button className="primary" disabled={selected===null} onClick={()=>{if(selected!==null)move([...answers,selected]);}}>다음<ArrowRight size={17}/></button></div>
   <div className="screening-step-meta">{answers.length>0&&<span>{answers.length}개 질문에 답했어요</span>}{answers.length>0&&<button onClick={()=>move([])}><RotateCcw size={12}/>처음부터 다시</button>}</div>
  </>:<>
   <div className="heading"><div className="eyebrow">SCOPE 3 · 스크리닝 완료</div><h1>우리 회사의 산정 항목을 확인해주세요</h1><p>답변을 바탕으로 정리한 검토 후보입니다. 카테고리를 선택해 자료 검토를 시작하세요.</p></div>
   <div className="screening-result-list">{session.categories.map(category=><div className={`screening-result-row ${category===1?'available':''}`} key={category}><span className="screening-result-number">CAT {category}</span><strong>{names[category-1]}</strong>{category===1?<button className="secondary" onClick={onStart}>자료 검토 시작<ArrowRight size={14}/></button>:<span className="screening-preparing">준비 중</span>}</div>)}{session.scope12&&<div className="screening-scope-note"><CheckCircle2 size={17}/>운영통제하는 자산은 Scope 1·2로 별도 검토합니다.</div>}</div>
   <details className="screening-evidence"><summary>답변과 판단 근거 확인</summary>{session.entries.map((entry,index)=><div key={entry.id}><div><span>{screeningQuestions[entry.id].text}</span><strong>{entry.answer?'예':'아니요'}</strong><button onClick={()=>move(answers.slice(0,index))}>수정</button></div>{entry.branch.note&&<p>{entry.branch.note}</p>}</div>)}</details>
   <div className="subtle-note"><Info size={17}/><span>이 스크리닝은 Cat 1·4·8·9·10·11·13을 다룹니다. 나머지 카테고리는 별도로 확인해주세요.</span></div>
   <div className="actions"><button className="text-button" onClick={()=>move(answers.slice(0,-1))}><ArrowLeft size={16}/>이전</button><button className="secondary" onClick={()=>move([])}><RotateCcw size={14}/>다시 시작</button></div>
  </>}
 </section>;
}
