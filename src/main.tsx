import {readApiJson} from './apiResponse';
import type {Cat1Inputs} from './cat1Calculation';
import {DEMO_FACTORS,DEMO_SOURCE,calculateDemo} from './demoFactors';
import {SimpleMethodReview,DemoResults} from './SimpleMethodReview';
import {productKey} from './productClassification';
import {useProductClassification} from './useProductClassification';
import {type EmissionFactor,type FactorLink,type MoneyBasis} from './factors';
import {buildContextPlan,approvedQuantityMappings} from './contextPlan';
import React,{useState,useRef,useEffect,useMemo} from 'react';
import {createRoot} from 'react-dom/client';
import {ArrowRight,ArrowLeft,Check,Package,Building2,Zap,Truck,Trash2,Plane,Users,KeyRound,Factory,Settings2,Power,Recycle,Store,Landmark,Upload,FileSpreadsheet,X,Info,CheckCircle2,HelpCircle,ClipboardList,Sparkles,Loader2,Download,ShieldCheck,Copy,FolderOpen} from 'lucide-react';
import * as XLSX from 'xlsx';
import {fields,type Mapping,type Column} from './shared';
import './style.css';
import {ProcessIcon} from './ProcessIcon';
import {parsedWorkbookTables as workbookTables,type ParsedWorkbook,type SheetReview} from './workbook';
import {DataTable} from './DataTable';
import {MappingPreview} from './MappingPreview';
import {ScreeningHome} from './ScreeningHome';
import {ContextReview} from './ContextReview';
import {groupPurchases,transactionAssignments,type GroupRule,type GroupDecision} from './grouping';
import {keepCompanyAnswers,contextFollowups,recordContextAnswer,type ReviewAnswers} from './reviewContext';
import {CategorySidebar} from './CategorySidebar';
import {screeningSession} from './screening';
import {advanceHistory,invalidateReview,stepLabels,type Step} from './history';
const names=['구매 제품·서비스','자본재','연료·에너지 관련 활동','외부 운송·보관','사업장 폐기물','출장','직원 통근','빌려 쓰는 자산','판매 후 외부 운송·보관','판매 제품의 가공','판매 제품의 사용','판매 제품의 폐기','빌려주는 자산','가맹점','투자'];

const requestText='안녕하세요. 구매 제품·서비스의 탄소배출량 산정 검토를 위해 ERP 구매내역 또는 구매대장(Excel/CSV)을 요청드립니다. 구매일자, 품목·서비스명, 공급업체, 구매금액과 통화, 수량과 단위가 포함되어 있으면 좋습니다. 보유하고 있는 항목만으로도 자료 검토를 시작할 수 있습니다.';
function App(){
 const [factorCatalog,setFactorCatalog]=useState<EmissionFactor[]>(DEMO_FACTORS),[factorError,setFactorError]=useState(''),[factorLoading,setFactorLoading]=useState(false);
 const [cat1Inputs,setCat1Inputs]=useState<Record<string,Cat1Inputs>>({});
 const [factorLinks,setFactorLinks]=useState<Record<string,FactorLink>>({});
 const [moneyBases,setMoneyBases]=useState<Record<string,MoneyBasis>>({});
 const [catalogProvenance,setCatalogProvenance]=useState<{retrievedAt:string;sha256:string}|null>(null);
 const [groupRules,setGroupRules]=useState<GroupRule[]>([]);
 const [groupDecisions,setGroupDecisions]=useState<Record<string,GroupDecision>>({});
 const [contextAnswers,setContextAnswers]=useState<ReviewAnswers>({});
 const [contextStart,setContextStart]=useState<string|undefined>();
 const [history,setHistory]=useState<Step[]>([]);
 const [screeningAnswers,setScreeningAnswers]=useState<boolean[]>([]);
 const screening=useMemo(()=>screeningSession(screeningAnswers),[screeningAnswers]);
 const [reviews,setReviews]=useState<SheetReview[]>([]),[confirmed,setConfirmed]=useState<string[]>([]),[headers,setHeaders]=useState<Record<string,number>>({}),[analyzing,setAnalyzing]=useState(false);
 const [step,setStep]=useState<Step>('categories'),[choice,setChoice]=useState(''),[file,setFile]=useState<File|null>(null),[book,setBook]=useState<ParsedWorkbook|null>(null),[sheet,setSheet]=useState(''),[header,setHeader]=useState(0),[error,setError]=useState(''),[maps,setMaps]=useState<Mapping[]>([]),[manual,setManual]=useState(false),[drag,setDrag]=useState(false),[reading,setReading]=useState(false),[copied,setCopied]=useState(false),[ack,setAck]=useState(false);
 const input=useRef<HTMLInputElement>(null);const sequence=useRef(0);const abort=useRef<AbortController|null>(null);
 const parser=useRef<Worker|null>(null);
 useEffect(()=>()=>{parser.current?.terminate();abort.current?.abort();},[]);
 const raw=useMemo(()=>book&&sheet?book.sheets[sheet]:[],[book,sheet]);
 const columns=useMemo<Column[]>(()=>{
  const width=raw.reduce((max,row)=>Math.max(max,row.length),0);
  return Array.from({length:width},(_,i)=>({id:`c${i}`,name:String(raw[header]?.[i]||`이름 없는 컬럼 ${i+1}`)}));
 },[raw,header]);
 const rows=useMemo(()=>raw.slice(header+1).filter(r=>r.some(c=>String(c).trim())).map(r=>columns.map((_,i)=>String(r[i]??''))),[raw,header,columns]);
 const reviewTasks=useMemo(()=>buildContextPlan(columns,rows,maps,contextAnswers),[columns,rows,maps,contextAnswers]);
 const calculationMappings=useMemo(()=>approvedQuantityMappings(maps,contextAnswers),[maps,contextAnswers]);
 const purchaseGroups=useMemo(()=>maps.length?groupPurchases(columns,rows,calculationMappings,groupRules):[],[columns,rows,maps,calculationMappings,groupRules]);
 const semantic=useProductClassification(step==='methods'&&!factorLoading,`${sequence.current}:${file?.name}:${sheet}:${header}`,purchaseGroups,columns,rows,maps,factorCatalog);
 const blockedRows=useMemo(()=>new Set(reviewTasks.filter(task=>contextAnswers[task.question.id]?.status!=='recorded'&&!['amount_basis','quantity_basis','quantity_difference','order_difference','invoice_difference','unit_meaning','package_details','unit_factor_details'].includes(task.question.id)).flatMap(task=>task.rows)),[reviewTasks,contextAnswers]);
 const spendBlockedRows=useMemo(()=>new Set(reviewTasks.filter(task=>task.question.id==='amount_basis'&&contextAnswers.amount_basis?.status!=='recorded').flatMap(task=>task.rows)),[reviewTasks,contextAnswers]);
 const emissionResults=useMemo(()=>calculateDemo(purchaseGroups,groupDecisions,factorLinks,columns,rows,maps,blockedRows,cat1Inputs,spendBlockedRows),[spendBlockedRows,cat1Inputs,purchaseGroups,groupDecisions,factorLinks,moneyBases,columns,rows,maps,blockedRows]);
 function resetGrouping(){setCat1Inputs({});setFactorLinks({});setMoneyBases({});setGroupRules([]);setGroupDecisions({});}
 useEffect(()=>{window.scrollTo(0,0);},[step]);
 function stopAnalysis(){const controller=abort.current;abort.current=null;controller?.abort();setAnalyzing(false);}
 function go(s:Step){
 stopAnalysis();
 setError('');setStep(s);setHistory(previous=>advanceHistory(previous,s));
 }
 function choose(value:string){if(value!==choice){invalidate();setFile(null);setBook(null);setSheet('');setHeaders({});}setChoice(value);}

 function invalidate(){stopAnalysis();resetGrouping();setContextAnswers(keepCompanyAnswers);setMaps([]);setReviews([]);setConfirmed([]);setAck(false);setError('');setHistory(invalidateReview);}
 async function read(f?:File,preferredHeader?:number){if(!f)return;const token=++sequence.current;parser.current?.terminate();invalidate();setBook(null);setFile(null);setHeaders({});setReading(true);
 try{if(!/\.(xlsx|xls|csv)$/i.test(f.name))throw new Error('Excel(.xlsx, .xls) 또는 CSV 파일을 선택해주세요.');if(f.size>10*1024*1024)throw new Error('10MB 이하의 파일을 선택해주세요.');
 const wb=await new Promise<ParsedWorkbook>((resolve,reject)=>{
 const worker=new Worker(new URL('./workbook.worker.ts',import.meta.url),{type:'module'});parser.current=worker;
 worker.onmessage=event=>{worker.terminate();if(parser.current===worker)parser.current=null;event.data.error?reject(new Error(event.data.error)):resolve(event.data.book);};
 worker.onerror=()=>{worker.terminate();if(parser.current===worker)parser.current=null;reject(new Error('파일을 읽지 못했습니다. 다른 파일을 선택해주세요.'));};
 worker.postMessage(f);
 });
 if(token!==sequence.current)return;
 const first=wb.SheetNames.find(name=>wb.sheets[name].length>1);if(!first)throw new Error('데이터가 있는 시트를 찾지 못했습니다. 헤더와 구매 내역이 있는 파일을 올려주세요.');
 const rr=wb.sheets[first];const found=rr.slice(0,20).findIndex(r=>r.filter(x=>String(x).trim()).length>=3);const initialHeader=preferredHeader!==undefined&&preferredHeader<rr.length?preferredHeader:Math.max(found,0);setHeader(initialHeader);setHeaders({[first]:initialHeader});setBook(wb);setSheet(first);setFile(f);
 }catch(e){if(token===sequence.current)setError(e instanceof Error?e.message:'파일을 읽지 못했습니다. 다른 파일을 선택해주세요.');}finally{if(token===sequence.current)setReading(false);}}
 function fallback(){resetGrouping();setContextAnswers(keepCompanyAnswers);setReviews([]);setConfirmed([]);setAck(false);setManual(true);setMaps(fields.map(f=>({field:f[0],column:null,status:'missing',reason:'원본 자료의 컬럼을 직접 연결해주세요.'})));go('mapping');}
 async function analyze(){
 if(!book||abort.current)return;
 resetGrouping();
 setContextAnswers(keepCompanyAnswers);
 let tables:ReturnType<typeof workbookTables>;try{tables=workbookTables(book,{...headers,[sheet]:header},sheet);if(!tables.length)throw new Error('분석할 데이터가 없습니다.');}catch(e){setError(e instanceof Error?e.message:'자료를 확인해주세요.');return;}
 setReviews([]);setConfirmed([]);setAck(false);setError('');
 const controller=new AbortController();abort.current=controller;setAnalyzing(true);
 try{
 const response=await fetch('/api/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sheets:tables}),signal:controller.signal});
 if(!response.ok){const result=await readApiJson(response);throw new Error(result.error);}
 if(!response.headers.get('content-type')?.includes('application/x-ndjson'))throw new Error('분석 API 응답 형식이 올바르지 않습니다. 서버 배포 설정을 확인해주세요.');
 if(!response.body)throw new Error('분석 연결이 끊겼습니다.');
 const reader=response.body.getReader(),decoder=new TextDecoder();let buffer='';let finished=false;
 while(true){const {value,done}=await reader.read();buffer+=decoder.decode(value,{stream:!done});const lines=buffer.split('\n');buffer=lines.pop()||'';for(const line of lines){if(!line.trim())continue;const event=JSON.parse(line);if(abort.current!==controller)return;
 if(event.type==='error')throw new Error(event.error);
 if(event.type==='result'){const result=event.reviews as SheetReview[];const active=result.find(r=>r.name===sheet)||result[0];setReviews(result);setSheet(active.name);setHeader(active.header);setMaps(active.mappings);setManual(false);setAck(false);finished=true;}
 }if(done)break;}
 if(!finished)throw new Error('컬럼 분석이 완료되지 않았습니다. 다시 시도해주세요.');
 if(abort.current===controller)go('mapping');
 }catch(e){if(abort.current===controller){go('upload');setError(e instanceof Error&&e.name!=='AbortError'?e.message:'분석 연결이 종료되었습니다. 다시 시도해주세요.');}}
 }
 function saveMappings(next:Mapping[]){resetGrouping();setContextAnswers(keepCompanyAnswers);setHistory(previous=>previous.filter(step=>!['context','done','methods','methodSummary'].includes(step)));setMaps(next);setReviews(old=>old.map(r=>r.name===sheet?{...r,mappings:next}:r));setConfirmed(old=>old.filter(s=>s!==sheet));setAck(false);}
 function updateMapping(field:string,column:string){saveMappings(maps.map(a=>a.field===field?{...a,column:column||null,status:(column?'recommended':'missing') as Mapping['status'],reason:'사용자가 직접 선택한 연결입니다.'}:a));}
 function addMapping(label:string,column:string){saveMappings([...maps,{field:`custom_${crypto.randomUUID()}`,label:label.trim(),column:column||null,status:column?'recommended':'missing',reason:'사용자가 추가한 컬럼입니다.'}]);}
 function removeMapping(field:string){if(field.startsWith('custom_'))saveMappings(maps.filter(mapping=>mapping.field!==field));}
 function confirmSheet(value:boolean){setAck(value);setConfirmed(old=>value?[...new Set([...old,sheet])]:old.filter(s=>s!==sheet));}

 async function sample(){
  if(reading)return;
  const token=++sequence.current;setReading(true);setError('');
  try{const response=await fetch(`${import.meta.env.BASE_URL}examples/chemical-purchases.xlsx`,{signal:AbortSignal.timeout(30000)});if(!response.ok)throw new Error('예시 파일을 불러오지 못했습니다. 다시 시도해주세요.');const data=await response.arrayBuffer();const signature=new Uint8Array(data,0,Math.min(2,data.byteLength));if(signature[0]!==0x50||signature[1]!==0x4b)throw new Error('예시 Excel 파일을 찾지 못했습니다.');if(token!==sequence.current)return;await read(new File([data],'화학_test (1).xlsx',{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),5);}
  catch(e){if(token===sequence.current)setError(e instanceof Error?e.message:'예시 파일을 불러오지 못했습니다.');}
  finally{if(token===sequence.current)setReading(false);}
 }

 function download(){const data={file:file?.name,sheet,headerRow:header+1,rowCount:rows.length,mode:manual?'manual':'ai-assisted',confirmedAt:new Date().toISOString(),mappings:maps.map(m=>({...m,columnName:columns.find(c=>c.id===m.column)?.name??null})),sheets:reviews.length?reviews:[{name:sheet,header,rowCount:rows.length,mappings:maps}],reviewedSheets:confirmed,screeningAnswers:screening.entries.map(entry=>({questionId:entry.id,answer:entry.answer})),calculationContext:{templateMethodInputs:cat1Inputs,answers:contextAnswers,quantityBasis:contextAnswers.quantity_basis?.choice??null,appliedQuantityColumns:calculationMappings.filter(mapping=>['quantity','unit'].includes(mapping.field)),reviewTasks:reviewTasks.map(task=>({id:task.question.id,reason:task.reason,dataRows:task.rows.map(index=>index+1)})),followups:reviewTasks.filter(task=>contextAnswers[task.question.id]?.status!=='recorded').map(task=>task.question).map(question=>({id:question.id,scope:question.scope,request:question.request})),status:'user-input-recorded',rowDecisionsApplied:false},grouping:{rules:groupRules,groups:purchaseGroups.map(group=>({id:group.id,name:group.name,dataRows:group.rowIndices.map(index=>index+1),reason:group.reason,decision:groupDecisions[group.id]??null})),transactions:transactionAssignments(purchaseGroups,groupDecisions)},productClassification:{inputs:semantic.inputs,results:semantic.results,userMeanings:semantic.meanings},emissions:{demo:true,notForReporting:true,notice:DEMO_SOURCE.notice,source:DEMO_SOURCE,provenance:catalogProvenance,factorLinks,moneyBases,transactions:emissionResults,demoKgCO2e:emissionResults.reduce((sum,result)=>sum+(result.kgCO2e??0),0),excludedFromTotal:emissionResults.filter(result=>result.status!=='calculated').length},emissionsCalculated:false,demoCalculated:emissionResults.some(result=>result.status==='calculated')};const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='carbon-desk-DEMO-not-for-reporting.json';a.click();URL.revokeObjectURL(url);}
 const heading=(eyebrow:string,title:string,desc:string)=><div className="heading"><div className="eyebrow">{eyebrow}</div><h1>{title}</h1>{desc&&<p>{desc}</p>}</div>;

 const footer=(back:()=>void,next?:()=>void,label='다음',disabled=false)=><div className="actions"><button className="text-button" onClick={back}><ArrowLeft size={16}/> 이전</button>{next&&<button className="primary" disabled={disabled} onClick={next}>{label}<ArrowRight size={17}/></button>}</div>;
 return <><header className="topbar app-header"><div className="app-header-inner"><button className="app-brand" aria-label="시작 화면으로" onClick={()=>go('categories')}><span>Carbon Agent</span></button><div className="app-header-location"><span>Scope 3</span><span className="header-divider">/</span><strong>{step==='categories'?'산정 범위 확인':'Cat 1 · 구매 제품·서비스'}</strong></div>{step!=='categories'&&<button className="header-home" onClick={()=>go('categories')}>카테고리 선택<ArrowRight size={14}/></button>}</div></header>
 <div className="workspace with-history">
 {step==='categories'&&<CategorySidebar names={names} candidates={screening.categories} completed={!screening.current} onStart={()=>go('intro')}/>}
 {step!=='categories'&&<aside className={`history-panel ${step==='intro'?'before-start':''}`} aria-label="결정 트리 진행 이력"><button className="history-back" onClick={()=>go('categories')}><ArrowLeft size={14}/>카테고리 목록</button><div className="history-category"><span>CAT 1</span><h2>구매 제품·서비스</h2></div><div className="history-caption">{step==='intro'?'진행 예정 경로':'진행 이력'}</div><nav aria-label="지나온 단계">
 <button className={`history-intro ${step==='intro'?'is-current':''}`} aria-current={step==='intro'?'step':undefined} onClick={()=>go('intro')}>{step==='intro'?<span className="history-current-dot"/>:<Check size={13}/>}시작 안내</button>
 {[
 {title:'구매내역 업로드',nodes:['question','none','unsure','upload'] as Step[]},
 {title:'에이전트 검토',nodes:['analyzing','mapping','context'] as Step[]},
 {title:'산정 방법 선택',nodes:['methods','methodSummary'] as Step[]},
 {title:'배출량 합산',nodes:[] as Step[]}
 ].map((group,i)=>{const visited=history.filter(h=>group.nodes.includes(h));const active=group.nodes.includes(step);const complete=i===0&&['analyzing','mapping','context','done','methods','methodSummary'].includes(step);return <div className={`history-group ${active?'is-active':''} ${complete?'is-complete':''}`} key={group.title}><div className="history-group-heading"><span className="history-stage-number">{complete?<Check size={12}/>:String(i+1).padStart(2,'0')}</span><h3>{group.title}</h3>{i===3&&<span className="history-later">예정</span>}</div>{visited.length>0&&<ol>{visited.map(node=>{if(node==='categories')return null;const current=node===step;const detail=node==='question'?({yes:'있어요',no:'없어요',unsure:'잘 모르겠어요'}[choice]||''):node==='unsure'?(history.includes('upload')?'자료 확보 후 진행':'담당자 확인 필요'):node==='upload'?(file?.name||'자료 선택 대기'):node==='analyzing'?(current?'분석 중':manual?'수동 연결로 진행':'대표 행으로 컬럼 분석'):node==='mapping'?`${manual?'수동 연결':'AI 추천'} · ${maps.filter(m=>m.column).length}개 연결`:node==='context'?'자료 범위·품목·수량 의미 확인':node==='done'?'추가 정보·확인 사항 정리':node==='none'?'자료 준비 후 재시작':'';return <li key={node} className={current?'is-current':''}><button disabled={node==='analyzing'&&!current} aria-current={current?'step':undefined} onClick={()=>{if(!current)go(node);}}><span className="history-node-dot">{!current&&<Check size={10}/>}</span><span className="history-node-text"><strong>{stepLabels[node]}</strong>{detail&&<small title={detail}>{detail}</small>}</span></button></li>;})}</ol>}</div>;})}
 </nav></aside>}
 <main>
 {step==='categories'?<ScreeningHome names={names} answers={screeningAnswers} onAnswers={setScreeningAnswers} onStart={()=>go('intro')}/>:<>

 <section className={`flow ${['mapping','done','methods','methodSummary'].includes(step)?'wide':''}`}>
 {step==='intro'&&<>
 {heading('CAT 1 · 구매 제품·서비스','구매 자료를 준비하고 배출량 산정을 시작하세요','Agent와 함께 구매 내역을 검토하고, 자료에 맞는 산정 방법으로 배출량을 확인합니다.')}
 <div className="intro-workflow" aria-label="Cat 1 산정 과정">{[
 {title:'구매내역 업로드',description:'ERP 구매내역이나 구매대장을 등록합니다.'},
 {title:'에이전트 검토',description:'원본을 확인하고 필요한 컬럼을 연결합니다.'},
 {title:'산정 방법 선택',description:'거래별 산정 방법과 배출계수를 연결합니다.'},
 {title:'배출량 합산',description:'Cat 1 배출량과 미반영 거래를 확인합니다.'}
 ].map(({title,description},i)=><div className="intro-workflow-card" key={title}><div className="intro-workflow-top"><span className="intro-workflow-icon"><ProcessIcon step={i}/></span></div><h2>{title}</h2><p>{description}</p></div>)}</div>
 <details className="intro-preparation" open><summary>자료 준비 안내</summary><div><p><strong>파일</strong> Excel(.xlsx, .xls) 또는 CSV 파일 1개 · 최대 10MB</p><p><strong>권장 항목</strong> 회사·사업장, 거래 문서번호, 품목·규격, 공급처, 주문·입고·청구 날짜와 수량·단위, 구매금액·통화 및 조정 내역</p><p><strong>산정 범위</strong> 산정하려는 기간과 법인·사업장의 구매 내역을 준비해주세요.</p></div></details>
 {footer(()=>go('categories'),()=>go('question'),'시작하기')}
 </>}

 {step==='question'&&<>{heading('01 · 자료 준비','구매 내역을 확인할 수 있는 자료가 있나요?','ERP 구매내역, 구매대장 또는 구매 거래내역을 정리한 파일이면 됩니다.')}<div className="choice-grid">{[['yes','있어요','구매 자료를 업로드할게요',FileSpreadsheet],['no','없어요','아직 자료를 준비하지 못했어요',FolderOpen],['unsure','잘 모르겠어요','담당자에게 확인이 필요해요',HelpCircle]].map(([v,t,d,I]:any)=><button key={v} className={`choice-card ${choice===v?'selected':''}`} onClick={()=>choose(v)} aria-pressed={choice===v}><span className="choice-check">{choice===v&&<Check size={14}/>}</span><I size={34} strokeWidth={1.4}/><strong>{t}</strong><p>{d}</p></button>)}</div><div className="help-box"><Info size={18}/><div><strong>자료가 완벽하지 않아도 괜찮아요.</strong><p>가지고 있는 자료부터 확인하고, 부족한 정보는 검토 단계에서 표시해드려요.</p></div></div>{footer(()=>go('intro'),()=>go(choice==='yes'?'upload':choice==='no'?'none':'unsure'),'다음',!choice)}</>}
 {(step==='none'||step==='unsure')&&<>{heading('01 · 자료 준비',step==='none'?'구매 자료가 필요해요':'구매·회계 담당자에게 확인해주세요',step==='none'?'자료를 준비한 뒤 다시 검토를 시작할 수 있어요.':'어떤 자료를 요청하면 되는지, 아래 내용을 담당자에게 전달해보세요.')}<div className="notice-panel"><ClipboardList size={32}/><h2>{step==='none'?'현재 상태 · 구매 자료 미확보':'요청할 자료 · ERP 구매내역 또는 구매대장'}</h2><p>구매일자, 품목·서비스명, 공급업체, 구매금액·통화,<br/>구매수량·단위가 포함된 자료가 있으면 좋아요.</p><div className="tag-row">{['ERP 구매내역','구매대장','Excel / CSV'].map(t=><span key={t}>{t}</span>)}</div><small>모든 항목이 없어도 자료 검토를 시작할 수 있습니다.</small></div>{step==='unsure'&&<div className="request-box"><p>{requestText}</p><button className="secondary" onClick={async()=>{try{await navigator.clipboard.writeText(requestText);setCopied(true);}catch{setError('복사하지 못했습니다. 위 문구를 선택해 복사해주세요.');}}}><Copy size={15}/>{copied?'복사했어요':'요청 문구 복사'}</button></div>}{footer(()=>go('question'),()=>go(step==='none'?'categories':'upload'),step==='none'?'카테고리 목록으로':'자료를 확보했어요')}{step==='unsure'&&<button className="defer" onClick={()=>go('categories')}>나중에 진행할게요</button>}</>}
 {step==='upload'&&<>{heading('01 · 구매내역 업로드','구매 자료 업로드','구매 내역을 업로드하고 시트와 헤더 행을 확인한 뒤, Agent의 컬럼 분석을 시작해주세요.')}<input ref={input} type="file" accept=".xlsx,.xls,.csv" hidden onChange={e=>{read(e.target.files?.[0]);e.target.value='';}}/>{!file?<><div className={`dropzone ${drag?'dragging':''}`} onDragOver={e=>{e.preventDefault();setDrag(true);}} onDragLeave={()=>setDrag(false)} onDrop={e=>{e.preventDefault();setDrag(false);if(e.dataTransfer.files.length>1){setError('파일은 한 번에 하나씩 올려주세요.');return;}read(e.dataTransfer.files[0]);}}><span className="upload-icon">{reading?<Loader2 className="spin"/>:<Upload size={30} strokeWidth={1.5}/>}</span><h2>{reading?'파일을 읽고 있어요':'파일을 끌어다 놓거나 선택해주세요'}</h2><p>Excel (.xlsx, .xls), CSV · 최대 10MB · 파일 1개</p><button className="primary" disabled={reading} onClick={()=>input.current?.click()}>파일 선택<ArrowRight size={16}/></button></div><button className="sample" disabled={reading} onClick={()=>void sample()}><FileSpreadsheet size={17}/>예시 데이터 넣기 <span>화학 ERP 구매·입고 내역</span><ArrowRight size={14}/></button></>:<><div className="file-bar"><span className="file-icon"><FileSpreadsheet/></span><div><strong>{file.name}</strong><small>{(file.size/1024).toFixed(1)} KB · {rows.length.toLocaleString()}개 데이터 행</small></div><button className="text-button" onClick={()=>input.current?.click()}>파일 바꾸기</button><button className="icon-button" aria-label="파일 삭제" onClick={()=>{sequence.current++;setFile(null);setBook(null);invalidate();}}><X size={18}/></button></div><div className="preview-controls"><label>시트<select value={sheet} onChange={e=>{const name=e.target.value;setSheet(name);const rr=book!.sheets[name];const detected=rr.slice(0,20).findIndex(r=>r.filter(c=>String(c).trim()).length>=3);setHeader(headers[name]??Math.max(detected,0));invalidate();}}>{book?.SheetNames.map(s=><option key={s}>{s}</option>)}</select></label><label>헤더 행<select value={header} onChange={e=>{setHeader(Number(e.target.value));setHeaders(old=>({...old,[sheet]:Number(e.target.value)}));invalidate();}}>{raw.slice(0,20).map((_,i)=><option key={i} value={i}>{i+1}번째 비어 있지 않은 행</option>)}</select></label><span>전체 데이터</span></div><DataTable key={`${sheet}:${header}`} columns={columns} rows={rows}/>{!rows.length&&<p className="error">선택한 헤더 아래에 데이터가 없습니다. 다른 행이나 시트를 선택해주세요.</p>}{columns.length>200&&<p className="error">200개 이하의 컬럼이 포함된 자료를 선택해주세요.</p>}</>}<div className="subtle-note"><ShieldCheck size={17}/><span>선택한 시트 1개의 헤더와 대표 행을 최대 24개 확인하여 컬럼을 연결합니다. 연결 결과는 해당 시트의 전체 내역에 적용됩니다.<br/>분석할 시트와 헤더를 확인해주세요. 원본 파일은 서버에 저장하지 않습니다.</span></div>{analyzing?<div className="actions"><button className="text-button" onClick={()=>go('question')}><ArrowLeft size={16}/> 이전</button><div className="inline-analysis"><button className="text-button" onClick={stopAnalysis}>분석 취소</button><button className="primary" disabled aria-live="polite"><Loader2 size={16} className="spin"/>컬럼 연결 중…</button></div></div>:footer(()=>go('question'),analyze,'이 자료 분석하기',!file||!rows.length||columns.length>200)}{file&&rows.length>0&&<button className="defer" onClick={fallback}>AI 없이 직접 컬럼 연결하기</button>}</>}
 {step==='mapping'&&<>{heading('02 · 에이전트 검토','구매 자료의 연결을 확인해주세요',manual?'원본 컬럼을 산정에 필요한 항목과 연결해주세요.':'Agent가 찾은 원본 컬럼을 확인하고, 필요한 연결만 수정해주세요.')}<MappingPreview columns={columns} rows={rows} mappings={maps} sheet={sheet} filename={file?.name??''} manual={manual} onChange={updateMapping} onAdd={addMapping} onRemove={removeMapping}/><label className="confirm-check"><input type="checkbox" checked={ack} onChange={e=>confirmSheet(e.target.checked)}/> 현재 시트의 컬럼 연결과 미확인·누락 항목을 검토했습니다.</label>{footer(()=>go('upload'),()=>{setContextStart(undefined);go('context');},'산정 조건 확인하기',!ack)}</>}
 {step==='context'&&<ContextReview groups={purchaseGroups} meanings={semantic.meanings} onMeanings={(ids,text)=>{semantic.onMeanings(ids,text);const keys=new Set(ids);const affected=new Set(purchaseGroups.filter(group=>keys.has(productKey(group))).map(group=>group.id));setFactorLinks(old=>Object.fromEntries(Object.entries(old).filter(([key])=>!affected.has(key))));setGroupDecisions(old=>Object.fromEntries(Object.entries(old).filter(([key])=>!affected.has(key))));}} answers={contextAnswers} columns={columns} mappings={maps} rows={rows} sheet={sheet} startAt={contextStart} onAnswer={(id,answer)=>{setGroupDecisions({});setContextAnswers(old=>recordContextAnswer(old,id,answer));}} onBack={()=>go('mapping')} onComplete={()=>go('methods')}/>}
 {step==='methods'&&<SimpleMethodReview mappings={maps} inputs={cat1Inputs} onInputs={(id,input)=>{setCat1Inputs(old=>({...old,[id]:input}));setFactorLinks(old=>Object.fromEntries(Object.entries(old).filter(([key])=>key!==id)));setGroupDecisions(old=>Object.fromEntries(Object.entries(old).filter(([key])=>key!==id)));}} semantic={{...semantic,onMeanings:(ids,text)=>{semantic.onMeanings(ids,text);const keys=new Set(ids);const affected=new Set(purchaseGroups.filter(group=>keys.has(productKey(group))).map(group=>group.id));setFactorLinks(old=>Object.fromEntries(Object.entries(old).filter(([key])=>!affected.has(key))));setGroupDecisions(old=>Object.fromEntries(Object.entries(old).filter(([key])=>!affected.has(key))));},onMeaning:(id,text)=>{semantic.onMeaning(id,text);const affected=new Set(purchaseGroups.filter(group=>productKey(group)===id).map(group=>group.id));setFactorLinks(old=>Object.fromEntries(Object.entries(old).filter(([key])=>!affected.has(key))));setGroupDecisions(old=>Object.fromEntries(Object.entries(old).filter(([key])=>!affected.has(key))));}}} results={emissionResults} links={factorLinks} columns={columns} rows={rows} groups={purchaseGroups} decisions={groupDecisions} onLink={(id,link)=>setFactorLinks(old=>{const next={...old};if(link)next[id]=link;else delete next[id];return next;})} onDecision={(id,decision)=>setGroupDecisions(old=>({...old,[id]:decision}))} onBack={()=>{setContextStart(undefined);go('context');}} onComplete={()=>go('methodSummary')}/>}
 {step==='methodSummary'&&<DemoResults results={emissionResults} onBack={()=>go('methods')} onDownload={download}/>}
 {error&&<div className="error" role="alert"><Info size={18}/>{error}</div>}
 </section></>}
 </main></div></>;
}
createRoot(document.getElementById('root')!).render(<App/>);
