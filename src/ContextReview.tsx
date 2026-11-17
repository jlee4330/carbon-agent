import {ProductIdentityReview} from './ProductIdentityReview';
import {RepeatScreening} from './RepeatScreening';
import {PeriodConfirmation} from './PeriodConfirmation';
import {questionEvidence} from './questionEvidence';
import {BatchProductMeaning} from './BatchProductMeaning';
import type {PurchaseGroup} from './grouping';
import {buildContextPlan,type ReviewTask} from './contextPlan';
import {DataTable} from './DataTable';
import {ContextInput} from './ContextInput';
import {useMemo,useState,type ReactNode} from 'react';
import {ArrowLeft,ArrowRight,Info,Building2,FileSpreadsheet} from 'lucide-react';
import type {Column,Mapping} from './shared';
import {contextInputKind,contextEvidence,buildContextAnswer,recordContextAnswer,type ContextQuestion,type ReviewAnswer,type ReviewAnswers} from './reviewContext';

type Props={groups:PurchaseGroup[];meanings:Record<string,string>;onMeanings:(ids:string[],text:string)=>void;answers:ReviewAnswers;columns:Column[];mappings:Mapping[];rows:string[][];sheet:string;startAt?:string;onAnswer:(id:string,answer:ReviewAnswer)=>void;onBack:()=>void;onComplete:()=>void};
export function ContextReview(props:Props){
 const tasks=useMemo(()=>buildContextPlan(props.columns,props.rows,props.mappings,props.answers),[props.columns,props.rows,props.mappings,props.answers]);
 const unanswered=tasks.filter(task=>!props.answers[task.question.id]);
 const [pending,setPending]=useState<ReviewAnswer|null>(null);
 const [activeId,setActiveId]=useState<string|null>(props.startAt??null);
 const task=tasks.find(task=>task.question.id===activeId)??unanswered[0]??tasks[0];
 const taskIndex=tasks.findIndex(item=>item.question.id===task?.question.id);
 function advance(answer:ReviewAnswer){if(!task)return;props.onAnswer(task.question.id,answer);setPending(null);const updated=recordContextAnswer(props.answers,task.question.id,answer);const upcoming=buildContextPlan(props.columns,props.rows,props.mappings,updated);const nextTask=upcoming.find(item=>!updated[item.question.id]);if(nextTask)setActiveId(nextTask.question.id);window.scrollTo(0,0);}
 function next(answer:ReviewAnswer){
  if(!task)return;
  const previous=props.answers[task.question.id];
  const candidate={...answer,support:previous?.choice===answer.choice?previous.support:undefined};
  if(contextInputKind(task.question,answer.choice)){props.onAnswer(task.question.id,candidate);setPending(candidate);window.scrollTo(0,0);}else advance(candidate);
 }
 if(task&&pending)return <ContextInput question={task.question} answer={pending} columns={props.columns} rows={props.rows} onBack={()=>setPending(null)} onSave={advance}/>;
 
 return <div className="condition-flow"><div className="heading"><div className="eyebrow">02 · 에이전트 검토 · 산정 조건 확인</div></div>
 <div className="condition-detail">{task?.question.id==='coverage'?<PeriodConfirmation key={JSON.stringify(props.answers.coverage??null)} columns={props.columns} rows={props.rows} mappings={props.mappings} previous={props.answers.coverage} onSave={advance} onCheckMapping={props.onBack}/>:task?.question.id==='product_details'?<ProductIdentityReview groups={props.groups} columns={props.columns} rows={props.rows} mappings={props.mappings} meanings={props.meanings} onMeanings={props.onMeanings} question={task.question} onNext={next}/>:task&&<ReviewTaskCard key={task.question.id} task={task} {...props}><ContextQuestionForm key={task.question.id+JSON.stringify(props.answers[task.question.id]??null)} {...props} rows={task.rows.map(index=>props.rows[index])} question={task.question} index={0} total={1} embedded onPrevious={()=>setActiveId(null)} onNext={next}/></ReviewTaskCard>}</div>

 <div className="actions"><button className="text-button" onClick={()=>{if(taskIndex>0)setActiveId(tasks[taskIndex-1].question.id);else props.onBack();}}><ArrowLeft size={16}/>{taskIndex>0?'이전 질문':'컬럼 연결'}</button><button className="primary" disabled={unanswered.length>0} onClick={props.onComplete}>거래 묶음·산정 방법 확인<ArrowRight size={16}/></button></div></div>;
}
function ReviewTaskCard({task,answers,columns,rows,mappings,groups,meanings,onMeanings,children}:Props&{task:ReviewTask;children:ReactNode}){
 const [expanded,setExpanded]=useState(false);
 const [batchOpen,setBatchOpen]=useState(false);
 const affectedRows=new Set(task.rows);
 const affectedGroups=groups.filter(group=>group.rowIndices.some(index=>affectedRows.has(index)));
 const answer=answers[task.question.id];
 const evidence=useMemo(()=>questionEvidence(task.question,columns,mappings,task.rows.map(index=>rows[index])),[task,columns,mappings,rows]);
 return <article className="review-task"><div className="review-task-heading"><div><h3>{task.question.title}</h3>{task.question.id!=='repeat_meaning'&&<p>{task.reason}</p>}</div></div>
 {task.question.id==='repeat_meaning'&&<RepeatScreening columns={columns} rows={rows} mappings={mappings} indices={task.rows}/>}
 {task.question.id!=='repeat_meaning'&&<div className="question-mapping-evidence">{evidence.length?<><table><thead><tr><th>확인할 정보</th><th>연결한 원본 컬럼</th><th>자료에서 확인되는 값</th></tr></thead><tbody>{evidence.map(item=><tr key={item.field}><th>{item.label}</th><td>{item.column}</td><td>{item.range??(item.examples.join(' · ')||'값 없음')}{item.incomplete&&<small>날짜 형식 또는 빈 값 확인 필요{item.examples.length?` · 원본 예: ${item.examples.join(' · ')}`:''}</small>}</td></tr>)}</tbody></table>{['coverage','missing_period'].includes(task.question.id)&&<p>연결한 날짜 컬럼별 기록 범위입니다. 산정 대상 기간 전체가 포함되었는지는 별도로 확인해주세요.</p>}</>:<p>이 질문에 해당하는 컬럼이 연결되어 있지 않습니다. 원본을 확인하거나 컬럼 연결 단계에서 수정해주세요.</p>}</div>}
 {task.productIssues&&<div className="context-evidence-grid">{task.productIssues.map(issue=><div className="context-evidence" key={issue.kind}><strong>{issue.title} · {issue.rows.length.toLocaleString()}행</strong><p>{issue.question}</p></div>)}</div>}

 {answer&&<p className="review-task-answer">{task.question.options.find(option=>option.id===answer.choice)?.label}{answer.support?.files?.length?` · 자료 ${answer.support.files.length}개 첨부`:''}</p>}
 <div className="review-task-actions condition-tools"><button className="text-button" onClick={()=>setExpanded(!expanded)}>{expanded?'원본 닫기':'해당 원본 보기'}</button>{task.question.id==='code_consistency'&&<button className="secondary" onClick={()=>setBatchOpen(!batchOpen)}>여러 품목 설명 입력</button>}</div>
 {batchOpen&&task.question.id==='code_consistency'&&<BatchProductMeaning groups={affectedGroups} meanings={meanings} onApply={onMeanings} onClose={()=>setBatchOpen(false)}/>}
 {expanded&&<DataTable columns={[{id:'__row__',name:'원본 데이터 행'},...columns]} rows={task.rows.map(index=>[String(index+1),...rows[index]])} label="확인 항목에 해당하는 원본 거래"/>}
 <div className="condition-answer">{children}</div>
 </article>;
}
function ContextQuestionForm({question,index,total,onPrevious,onNext,embedded=false,...props}:Props&{question:ContextQuestion;index:number;total:number;embedded?:boolean;onPrevious:()=>void;onNext:(answer:ReviewAnswer)=>void}){
 const previous=props.answers[question.id];
 const [choice,setChoice]=useState(previous?.choice??''),[note,setNote]=useState(previous?.note??''),[error,setError]=useState('');
 const evidence=(question.fields??(question.field?[question.field]:[])).map(field=>contextEvidence(field,props.columns,props.mappings,props.rows)).filter(value=>value?.column);
 const option=question.options.find(option=>option.id===choice);
 const Icon=question.scope==='company'?Building2:FileSpreadsheet;
 function submit(){try{onNext(buildContextAnswer(question,choice,choice==='unknown'?'':note));}catch(error){setError(error instanceof Error?error.message:'답변을 확인해주세요.');}}
 return <>
  {!embedded&&<><div className="heading"><div className="eyebrow">02 · 에이전트 검토 · 산정 조건 확인</div><h1>{question.title}</h1><p>{question.description}</p></div>
  <div className="context-scope"><span><Icon size={15}/>{question.scope==='company'?'회사 차원의 기준':'현재 자료의 기준'}</span><small>{question.scope==='company'?'원본 데이터로 판단하지 않고 사용자에게 확인합니다.':props.sheet}</small></div>
  {evidence.length>0&&<div className="context-evidence-grid">{evidence.map(item=><div className="context-evidence" key={item!.column}><span>원본 예시 · {item!.column}</span><div>{item!.values.map((value,i)=><code key={i}>{value||'빈 값'}</code>)}</div></div>)}</div>}
  </>}
  {question.id==='unit_meaning'&&<p className="subtle-note">배출계수 연결 후 L → kg 등 환산이 필요한 경우에 제품별 밀도·중량 자료를 확인합니다.</p>}
  <fieldset className="context-radio-options"><legend className="sr-only">{question.title}</legend>{question.options.map(answerOption=><label key={answerOption.id} className={choice===answerOption.id?'selected':''}><input type="radio" name={`answer-${question.id}`} value={answerOption.id} checked={choice===answerOption.id} onChange={()=>{setChoice(answerOption.id);setNote('');setError('');}}/><span>{answerOption.label}</span></label>)}</fieldset>
  {choice&&choice!=='unknown'&&!contextInputKind(question,choice)&&<details className="context-extra-details" key={choice}><summary><FileSpreadsheet size={14}/>{option?.needsDetails?'기준·상세 내용 입력':'메모 추가'}<span>선택</span></summary><label className="context-note-label">추가 설명<textarea maxLength={2000} rows={3} value={note} onChange={event=>{setNote(event.target.value);setError('');}} placeholder={question.id==='amount_basis'?'예: 부가세 제외 공급가액, KRW 환산 금액':'알고 있는 기준이나 참고할 내용을 남겨주세요.'}/></label></details>}
  {error&&<p className="error" role="alert">{error}</p>}
  {choice!=='unknown'&&<div className="context-followup-hint"><Info size={15}/>{option?.followup?'이 답변은 추가 확인할 항목으로 남깁니다. 다음 질문으로 진행할 수 있어요.':option?.needsDetails&&!note.trim()?'상세 내용은 나중에 입력해도 됩니다. 비워두면 추가 확인할 항목으로 남겨둘게요.':'답변은 사용자 확인 내용으로 기록합니다. 원본 수정이나 거래 제외는 아직 적용하지 않습니다.'}</div>}

  <div className="actions">{!embedded&&<button className="text-button" onClick={onPrevious}><ArrowLeft size={16}/>이전</button>}<button className="primary" disabled={!choice} onClick={submit}>{contextInputKind(question,choice)?'자료 입력하기':'답변 저장하고 계속'}<ArrowRight size={16}/></button></div>

 </>;
}
