import {useState} from 'react';
import {periodEvidence} from './periodEvidence';
import type {Column,Mapping} from './shared';
import type {ReviewAnswer} from './reviewContext';
export function PeriodConfirmation({columns,rows,mappings,previous,onSave,onCheckMapping}:{columns:Column[];rows:string[][];mappings:Mapping[];previous?:ReviewAnswer;onSave:(answer:ReviewAnswer)=>void;onCheckMapping:()=>void}){
 const evidence=periodEvidence(columns,rows,mappings);
 const [choice,setChoice]=useState('');const [start,setStart]=useState(previous?.period?.start??''),[end,setEnd]=useState(previous?.period?.end??'');
 const ready=Boolean(evidence?.start&&evidence?.end);const accepted=choice==='yes';const from=accepted?evidence?.start??'':start,to=accepted?evidence?.end??'':end;
 function save(){onSave({choice:'complete',note:`산정 대상 기간: ${from} ~ ${to}`,source:'user',scope:'dataset',status:'recorded',answeredAt:new Date().toISOString(),period:{start:from,end:to,columnId:evidence?.columnId??null,dateField:evidence?.field??null,source:accepted?'data-range':'user',observedStart:evidence?.start??null,observedEnd:evidence?.end??null}});}
 return <section className="period-confirmation"><div className="review-task-heading"><h3>{ready?'이 기간으로 산정할까요?':'현재 자료의 날짜 범위를 확인하지 못했어요'}</h3><p>{ready?`연결한 ‘${evidence!.column}’ 컬럼에서 읽을 수 있는 날짜를 기준으로 제안한 기간입니다.`:'먼저 날짜 컬럼 연결과 원본 날짜 형식을 확인해주세요. 확인된 자료를 기준으로 산정 기간을 제안하겠습니다.'}</p></div>
 {ready&&evidence&&<div className="period-range"><div><span>자료의 시작일</span><strong>{evidence.start||'확인 필요'}</strong></div><span>→</span><div><span>자료의 종료일</span><strong>{evidence.end||'확인 필요'}</strong></div></div>}
 {ready&&<fieldset className="context-radio-options"><legend className="sr-only">산정 기간 확인</legend>{ready&&<label className={accepted?'selected':''}><input type="radio" name="period" checked={accepted} onChange={()=>setChoice('yes')}/><span>예 · 이 기간으로 산정할게요</span></label>}<label className={choice==='no'?'selected':''}><input type="radio" name="period" checked={choice==='no'} onChange={()=>setChoice('no')}/><span>아니요 · 다른 기간으로 산정할게요</span></label></fieldset>}
 {choice==='no'&&<div className="batch-meaning-controls"><label>산정 시작일<input type="date" value={start} onChange={e=>setStart(e.target.value)}/></label><label>산정 종료일<input type="date" min={start} value={end} onChange={e=>setEnd(e.target.value)}/></label></div>}
 <div className="actions">{!ready?<button className="primary" onClick={onCheckMapping}>날짜 컬럼 확인하기</button>:<button className="primary" disabled={!choice||!from||!to||from>to} onClick={save}>이 기간으로 확인하고 계속</button>}</div></section>;
}
