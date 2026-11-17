import {contextQuestions,activeContextQuestions,type ContextQuestion,type ReviewAnswers} from './reviewContext';
import {numericValue} from './grouping';
import type {Column,Mapping} from './shared';
export type ProductIssue={kind:'code'|'broad'|'missing';title:string;question:string;rows:number[]};
export type ReviewTask={question:ContextQuestion;kind:'common'|'exception';reason:string;rows:number[];examples:{value:string;count:number}[];productIssues?:ProductIssue[]};
export function buildContextPlan(columns:Column[],rows:string[][],mappings:Mapping[],answers:ReviewAnswers):ReviewTask[]{
 const indices=new Map(mappings.map(m=>[m.field,columns.findIndex(c=>c.id===m.column)]));
 const value=(row:string[],field:string)=>row[indices.get(field)??-1]?.trim()??'';
 const has=(field:string)=>(indices.get(field)??-1)>=0;
 const all=rows.map((_,i)=>i),tasks=new Map<string,ReviewTask>();
 function add(id:string,kind:ReviewTask['kind'],reason:string,selected=all,exampleField?:string){
  const question=contextQuestions.find(q=>q.id===id)!;
  const counts=new Map<string,number>();for(const i of selected){const text=exampleField?value(rows[i],exampleField):'';if(text)counts.set(text,(counts.get(text)??0)+1);}
  tasks.set(id,{question,kind,reason,rows:selected,examples:[...counts].map(([value,count])=>({value,count})).sort((a,b)=>b.count-a.count)});
 }
 add('coverage','common','파일 밖의 누락은 자동 판별할 수 없습니다. 전체 자료의 포함 범위만 한 번 확인해주세요.',all,has('site')?'site':'company');
 const quantityPairs=[['receipt','receipt_quantity','receipt_unit'],['purchase','quantity','unit'],['invoice','invoice_quantity','invoice_unit'],['order','order_quantity','order_unit']];
 const pairs=quantityPairs.filter(([,q])=>has(q));
 if(pairs.length){
  const preferred=pairs[0];
  add('quantity_basis','common',`‘${columns[indices.get(preferred[1])!].name}’을 공통 수량 기준 후보로 제안합니다. 실제 받은 양인지는 사용자 확인이 필요합니다.`,all,preferred[1]);
  const task=tasks.get('quantity_basis')!;
  task.question={...task.question,title:'이 자료 전체에 적용할 구매수량 기준을 확인해주세요',options:task.question.options.filter(o=>pairs.some(([choice])=>choice===o.id)||['varies','absent','unknown'].includes(o.id))};
 }
 if(!pairs.length){add('quantity_basis','common','연결된 수량이 없습니다. 수량 자료가 없는지, 추가 확인이 필요한지 답변해주세요.');const task=tasks.get('quantity_basis')!;task.question={...task.question,options:task.question.options.filter(option=>['absent','unknown'].includes(option.id))};}
 if(has('amount'))add('amount_basis','common','금액의 포함 범위는 파일 전체 기준으로 한 번 확인합니다.',all,'currency');
 const issues:ProductIssue[]=[
  {kind:'code',title:'내부 코드·약어',question:'품목대장이 있나요? 없다면 같은 제품군의 코드 범위를 선택해 실제 제품명·성분 또는 용도를 한 번에 알려주세요.',rows:[]},
  {kind:'broad',title:'포괄적인 제품명',question:'제품명이나 주요 성분·용도를 확인할 수 있나요? 예: 세척제 → 설비용 알칼리 세정제. 모르는 성분은 추정하지 않아도 됩니다.',rows:[]},
  {kind:'missing',title:'품목명 누락',question:'품목코드에 대응하는 제품명이나 설명이 다른 컬럼 또는 품목대장에 있나요?',rows:[]}
 ];
 for(const i of all){const item=value(rows[i],'item'),code=value(rows[i],'code');const kind=!item?'missing':(code&&item===code)||/^[A-Z][A-Z0-9_-]*\d[A-Z0-9_-]*$/i.test(item)?'code':/^(세척제|세정제|원재료|기타|용역|서비스|화학제품|화학물질|부품|소모품|수지)$/.test(item)?'broad':null;if(kind)issues.find(issue=>issue.kind===kind)!.rows.push(i);}
 const coded=issues.flatMap(issue=>issue.rows).sort((a,b)=>a-b);
 if(coded.length){add('product_details','exception','제품 식별이 필요한 항목을 유형별로 모았습니다. 품목대장·원본 설명을 우선 활용하고, 자료가 없으면 공통 설명을 적용하세요.',coded,has('item')?'item':'code');tasks.get('product_details')!.productIssues=issues.filter(issue=>issue.rows.length);}
 if(!coded.length)add('product_details','common','표시된 이름만으로 제품·서비스와 사양을 구분할 수 있는지 확인해주세요.',all,'item');
 const keyField=has('order_id')?'order_id':'id';
 const repeated=new Set<number>();
 // Compare complete source rows as well as repeated purchase identifiers.
 for(const field of [null,...(has(keyField)?[keyField]:[])] as (string|null)[]){const buckets=new Map<string,number[]>();for(const i of all){const key=field?value(rows[i],field):JSON.stringify(rows[i]);if(!key||(!field&&!rows[i].some(v=>v.trim())))continue;const bucket=buckets.get(key)??[];bucket.push(i);buckets.set(key,bucket);}for(const bucket of buckets.values())if(bucket.length>1)for(const i of bucket)repeated.add(i);}
 if(repeated.size)add('repeat_meaning','exception','같은 구매번호 또는 동일한 원본 기록이 발견됐습니다. 아래 기록이 여러 번 받은 내역인지, 수정 이력인지, 중복인지 확인해주세요.',[...repeated].sort((a,b)=>a-b),has(keyField)?keyField:undefined);
 const numericIssues=all.filter(i=>[...pairs.map(([,q])=>q),...(has('amount')?['amount']:[])].some(field=>{const raw=value(rows[i],field),number=numericValue(raw);return !raw||number===null||number<0;}));
 if(numericIssues.length)add('numeric_quality','exception','빈 값·숫자로 해석할 수 없는 값·음수 수량 또는 금액을 한 번에 확인합니다. 값을 자동 수정하지 않습니다.',numericIssues);
 const differences=all.filter(i=>[['order_quantity','order_unit','receipt_quantity','receipt_unit'],['receipt_quantity','receipt_unit','invoice_quantity','invoice_unit']].some(([q1,u1,q2,u2])=>{const unit=value(rows[i],u1),a=numericValue(value(rows[i],q1)),b=numericValue(value(rows[i],q2));return unit&&unit===value(rows[i],u2)&&a!==null&&b!==null&&a!==b;}));
 if(differences.length)add('quantity_difference','exception','같은 단위로 기록된 주문·입고·청구 수량에 차이가 있는 행입니다.',differences);
 const unitFields=pairs.map(([, ,unit])=>unit).filter(has);
 const uncertain=all.filter(i=>unitFields.some(field=>{const unit=value(rows[i],field);return !unit||! /^(kg|g|t|ton|tonne|lb|l|ml|m3|㎏|킬로그램|리터)$/i.test(unit);}));
 if(uncertain.length)add('unit_meaning','exception','포장·개수 단위 또는 빈 단위가 있습니다. 환산을 임의로 적용하지 않습니다.',uncertain,unitFields[0]);
 // Previously answered optional questions remain editable, but never turn every question into a mandatory survey.
 const active=activeContextQuestions(answers);
 if(answers.coverage?.period&&active.some(q=>q.id==='missing_period'))add('missing_period','exception','선택한 산정 기간이 자료에서 확인한 날짜 범위보다 넓습니다. 추가 기간의 내역을 확인해주세요.');
 for(const question of active){if(question.when&&tasks.has(question.when.id)){const parent=tasks.get(question.when.id)!;add(question.id,'exception',['package_details','unit_factor_details'].includes(question.id)?question.description:'앞서 선택한 답변에 필요한 추가 확인입니다.',parent.rows);}
  else if(!question.when&&!['repeat_meaning','code_consistency'].includes(question.id)&&answers[question.id]&&!tasks.has(question.id))add(question.id,'common','기록한 확인 내용을 수정할 수 있습니다.');}
 return [...tasks.values()].sort((a,b)=>contextQuestions.findIndex(q=>q.id===a.question.id)-contextQuestions.findIndex(q=>q.id===b.question.id));
}
export function approvedQuantityMappings(mappings:Mapping[],answers:ReviewAnswers):Mapping[]{
 const choice=answers.quantity_basis?.status==='recorded'?answers.quantity_basis.choice:'';
 const pair:Record<string,[string,string]>={receipt:['receipt_quantity','receipt_unit'],purchase:['quantity','unit'],invoice:['invoice_quantity','invoice_unit'],order:['order_quantity','order_unit']};
 if(!pair[choice])return mappings.filter(m=>m.field!=='quantity'&&m.field!=='unit');
 const [quantity,unit]=pair[choice].map(field=>mappings.find(m=>m.field===field));
 return [...mappings.filter(m=>m.field!=='quantity'&&m.field!=='unit'),...(quantity?[{...quantity,field:'quantity'}]:[]),...(unit?[{...unit,field:'unit'}]:[])];
}
