import type {Column,Mapping} from './shared';
export type SupportingFile={name:string;size:number;dataUrl:string};
export type AnswerDetails={contact?:{department:string;name:string};support?:{kind:'file'|'column'|'text'|'deferred';files?:SupportingFile[];columnIds?:string[]}};
export type ReviewAnswer=AnswerDetails&{period?:{start:string;end:string;columnId:string|null;dateField:string|null;source:'data-range'|'user';observedStart:string|null;observedEnd:string|null};choice:string;note:string;source:'user';scope:'company'|'dataset';status:'recorded'|'followup';answeredAt:string};
export type ReviewAnswers=Record<string,ReviewAnswer>;
type Option={id:string;label:string;followup?:boolean;needsDetails?:boolean};
export type ContextQuestion={id:string;scope:'company'|'dataset';title:string;description:string;field?:string;options:Option[];request:string;stage:1|2|3;when?:{id:string;choices:string[]};fields?:string[]};
const unsure:Option={id:'unknown',label:'잘 모르겠어요 · 담당자 확인 필요',followup:true};
export const contextStages=['자료의 범위와 누락','구매한 제품·서비스','구매량·금액과 단위'] as const;
const q=(stage:1|2|3,id:string,title:string,description:string,options:Option[],request:string,extra:Partial<ContextQuestion>={}):ContextQuestion=>({stage,id,scope:'dataset',title,description,options:[...options,unsure],request,...extra});
export const contextQuestions:ContextQuestion[]=[
 q(1,'coverage','이번 산정 기간과 대상 사업장의 구매 내역이 모두 포함되어 있나요?','파일에 나타나지 않는 구매가 없었다고 판단하지 않습니다. 준비하려는 범위와 비교해주세요.',[{id:'complete',label:'예 · 모두 포함되어 있어요'},{id:'incomplete',label:'아니요 · 빠진 내역이 있어요',followup:true}],'이번 산정 범위와 자료의 포함 범위를 확인해주세요.'),
 q(1,'missing_scope','어떤 범위의 구매 내역이 빠져 있나요?','빠진 범위에 맞는 추가 질문만 확인합니다.',[{id:'period',label:'일부 기간'},{id:'site',label:'일부 사업장'},{id:'both',label:'기간과 사업장 모두'}],'누락된 기간 또는 사업장 범위를 확인해주세요.',{when:{id:'coverage',choices:['incomplete']}}),
 q(1,'missing_period','나머지 기간의 구매 내역은 어떻게 관리하나요?','자료가 없는 기간과 구매가 없었던 기간을 구분합니다.',[{id:'separate',label:'별도 파일에 있어요',followup:true},{id:'none',label:'해당 기간에는 구매가 없었어요',needsDetails:true},{id:'missing',label:'구매는 있었지만 자료를 아직 확보하지 못했어요',followup:true}],'빠진 기간과 별도 구매 자료 또는 구매가 없었던 기간을 확인해주세요.',{when:{id:'missing_scope',choices:['period','both']}}),
 q(1,'missing_site','어느 사업장이 빠져 있나요? 구매 자료는 별도로 관리하나요?','메모에 빠진 사업장과 자료 위치를 함께 남길 수 있습니다.',[{id:'separate',label:'별도 자료로 관리하고 있어요',followup:true},{id:'missing',label:'아직 자료를 확보하지 못했어요',followup:true},{id:'none',label:'빠진 사업장에는 해당 기간 구매가 없어요',needsDetails:true}],'빠진 사업장과 별도 자료의 관리 위치를 확인해주세요.',{when:{id:'missing_scope',choices:['site','both']}}),
 q(1,'repeat_meaning','반복된 기록은 어떤 내역인가요?','시스템이 발견한 반복 후보입니다. 실제 중복인지 확인해주세요.',[{id:'split',label:'분할 입고·서로 다른 상세 품목'},{id:'revision',label:'수정 이력',followup:true},{id:'duplicate',label:'중복 기록',followup:true},{id:'mixed',label:'여러 유형이 섞여 있어요',followup:true}],'분할 입고·수정 이력·중복 기록을 구분할 기준을 확인해주세요.',{fields:['order_id','line_id','id','item','receipt_date','receipt_quantity']}),
 q(2,'product_details','코드·약어의 실제 제품 정보를 확인해주세요','CHEM-001 같은 내부 코드나 ‘세척제’ 같은 포괄적인 이름은 추가 정보가 필요할 수 있습니다.',[{id:'master',label:'품목대장 업로드',followup:true},{id:'manual',label:'묶음별 설명 입력',followup:true},{id:'sufficient',label:'제품 정보를 확인했어요'},{id:'coded',label:'코드나 약어 위주로 되어 있어요'},{id:'broad',label:'이름이 포괄적이거나 사양이 부족해요'}],'품목명과 사양의 구체성을 확인해주세요.',{fields:['item','code','specification']}),
 q(2,'product_reference','실제 제품명과 사양을 확인할 자료가 있나요?','품목대장·제품 사양표를 우선 활용합니다. 여기서 품목을 하나씩 입력할 필요는 없습니다.',[{id:'master',label:'품목코드와 연결할 수 있는 품목대장이 있어요',followup:true},{id:'spec',label:'제품 사양표·주요 성분 자료가 있어요',followup:true},{id:'column',label:'원본의 다른 컬럼에서 확인할 수 있어요',followup:true},{id:'none',label:'추가 자료가 없어 확인이 필요해요',followup:true}],'품목대장·사양 자료 또는 원본의 상세 컬럼을 확보해 연결해주세요.',{when:{id:'product_details',choices:['coded','broad']}}),
 q(2,'code_consistency','같은 품목코드는 항상 같은 제품·규격을 뜻하나요?','공급업체나 구매 시기에 따라 코드의 의미가 달라지는지 확인합니다.',[{id:'same',label:'항상 같은 제품·규격을 뜻해요'},{id:'supplier',label:'공급업체에 따라 달라질 수 있어요',followup:true},{id:'time',label:'구매 시기에 따라 달라질 수 있어요',followup:true},{id:'varies',label:'여러 제품·규격에 사용되는 코드가 있어요',followup:true},{id:'absent',label:'품목코드를 사용하지 않아요'}],'코드만으로 구분할 수 없는 품목의 공급업체·시기·규격 기준을 확인해주세요.',{field:'code'}),
 q(3,'quantity_basis','실제로 구매해 받은 양은 어느 수량으로 확인할 수 있나요?','연결된 수량의 의미를 확인합니다. 답변만으로 원본 수량을 합치거나 대체하지 않습니다.',[{id:'receipt',label:'입고수량으로 확인해요'},{id:'invoice',label:'청구수량으로 확인해요'},{id:'order',label:'주문수량이 실제 받은 양과 같아요'},{id:'purchase',label:'별도의 구매수량 컬럼으로 확인해요'},{id:'varies',label:'거래마다 기준이 달라요',followup:true},{id:'absent',label:'수량 자료가 없어요'}],'실제 받은 양에 해당하는 수량과 대응 단위를 확인해주세요.',{fields:['quantity','unit','order_quantity','order_unit','receipt_quantity','receipt_unit','invoice_quantity','invoice_unit']}),
 q(3,'numeric_quality','빈 값·음수·숫자 형식이 다른 거래는 어떻게 확인할까요?','반품·정정 거래와 누락 또는 표시 형식을 구분합니다. 음수 거래를 자동 삭제하거나 절댓값으로 바꾸지 않습니다.',[{id:'adjustments',label:'반품·정정 내역이 포함되어 있어요',followup:true},{id:'format',label:'숫자 표시 형식을 확인해야 해요',followup:true},{id:'missing',label:'자료가 누락된 거래가 있어요',followup:true}],'해당 거래의 원본 숫자·반품·정정 여부를 확인해주세요.'),
 q(3,'quantity_difference','주문·입고·청구 수량 사이에 차이가 있나요?','서로 다른 단위의 숫자는 그대로 비교할 수 없습니다. 차이의 의미를 아는 범위에서 알려주세요.',[{id:'same',label:'같은 단위로 비교하면 차이가 없어요'},{id:'order_receipt',label:'주문량과 입고량이 달라요'},{id:'receipt_invoice',label:'입고량과 청구량이 달라요'},{id:'both',label:'두 경우 모두 차이가 있어요'},{id:'not_comparable',label:'하나의 수량만 있거나 단위가 달라 비교하기 어려워요'}],'수량 차이가 있는 거래의 납품·취소·청구 시점을 확인해주세요.'),
 q(3,'order_difference','주문량과 입고량의 차이는 무엇 때문인가요?','차이를 임의로 취소나 반품으로 처리하지 않습니다.',[{id:'pending',label:'아직 납품되지 않은 물량이에요',followup:true},{id:'cancelled',label:'주문이 취소된 물량이에요',followup:true},{id:'mixed',label:'미납품·취소 등 여러 이유가 섞여 있어요',followup:true}],'미납품·취소 물량과 해당 거래를 구분해주세요.',{when:{id:'quantity_difference',choices:['order_receipt','both']}}),
 q(3,'invoice_difference','입고량과 청구량의 차이는 무엇 때문인가요?','입고 시점과 청구 시점이 다른 거래인지 확인합니다.',[{id:'unbilled',label:'입고된 물량 중 아직 청구되지 않은 것이 있어요',followup:true},{id:'earlier',label:'이전 입고분이 이번에 청구되었어요',followup:true},{id:'mixed',label:'여러 시점의 입고·청구가 섞여 있어요',followup:true}],'입고와 청구의 시점 차이를 구분할 자료를 확인해주세요.',{when:{id:'quantity_difference',choices:['receipt_invoice','both']}}),
 q(3,'amount_basis','구매금액에 포함된 항목을 확인할 수 있나요?','구매금액·통화와 세금·할인·환불·부대비용의 관계를 기록합니다. 아직 금액을 조정하지 않습니다.',[{id:'known',label:'포함 범위를 알고 있어요',needsDetails:true},{id:'separate',label:'세금·할인·환불·부대비용이 별도로 표시되어 있어요'},{id:'mixed',label:'거래마다 포함 기준이 달라요',followup:true},{id:'absent',label:'금액 자료가 없어요'}],'구매금액의 세금·할인·환불·부대비용 포함 범위와 통화를 확인해주세요.',{fields:['amount','currency','tax','discount','refund','additional_cost']}),
 q(3,'unit_meaning','이 단위는 어떤 기준으로 계산할까요?','EA·통·박스는 내용물의 순중량 또는 해당 제품의 단위당 배출계수를 확인합니다.',[{id:'clear',label:'중량·부피 등 단위의 의미가 명확해요'},{id:'package',label:'EA·통·박스당 내용물 순중량으로 환산할게요'},{id:'per_unit_factor',label:'해당 제품의 EA·단위당 배출계수가 있어요',followup:true},{id:'mixed',label:'여러 단위가 섞여 있어 추가 해석이 필요해요',followup:true},{id:'absent',label:'수량이나 단위 자료가 없어요'}],'수량 단위의 의미와 품목별 환산 자료를 확인해주세요.',{fields:['unit','order_unit','receipt_unit','invoice_unit']}),
 q(3,'package_details','1개에 들어 있는 내용물의 순중량은 몇 kg인가요?','포장재를 제외한 내용물 기준입니다. EA·통·박스별로 확인하고, 품목이나 규격에 따라 다르면 각각 알려주세요.',[{id:'known',label:'품목별 순중량을 입력할게요',needsDetails:true},{id:'table',label:'품목별 단위·순중량 표가 있어요',followup:true},{id:'spec',label:'제품 사양표에서 확인할 수 있어요',followup:true},{id:'none',label:'추가 확인이 필요해요',followup:true}],'품목별 포장 용량·중량과 단위 환산 자료를 확보해주세요.',{when:{id:'unit_meaning',choices:['package','mixed']}}),
 q(3,'unit_factor_details','단위당 배출계수 자료를 연결해주세요','제품·규격, 기준 단위(EA·통·박스), kg CO₂e/단위, 출처와 적용 연도를 확인할 수 있는 자료를 첨부해주세요. 계수의 단위가 구매수량 단위와 일치해야 합니다.',[{id:'file',label:'제품별 배출계수 자료를 업로드할게요',followup:true},{id:'none',label:'자료를 추가로 확인해야 해요',followup:true}],'제품·규격에 맞는 단위당 배출계수와 출처·적용 기준을 확인해주세요.',{when:{id:'unit_meaning',choices:['per_unit_factor']}}),
];
export function contextInputKind(question:ContextQuestion,choice:string):'file'|'column'|'text'|null{
 if(choice==='unknown')return null;
 if(question.id==='product_details'&&choice==='master')return 'file';
 if(question.id==='unit_factor_details'&&choice==='file')return 'file';
 if((['missing_period','missing_site'].includes(question.id)&&choice==='separate')||(question.id==='product_reference'&&['master','spec'].includes(choice))||(question.id==='package_details'&&['table','spec'].includes(choice)))return 'file';
 if(question.id==='product_reference'&&choice==='column')return 'column';
 return question.options.find(option=>option.id===choice)?.needsDetails?'text':null;
}
export function activeContextQuestions(answers:ReviewAnswers):ContextQuestion[]{
 const active:ContextQuestion[]=[];
 const period=answers.coverage?.period;
 const outside=Boolean(period&&period.observedStart&&period.observedEnd&&(period.start<period.observedStart||period.end>period.observedEnd));
 for(const question of contextQuestions)if((question.id==='missing_period'&&outside)||!question.when||(active.some(parent=>parent.id===question.when!.id)&&question.when.choices.includes(answers[question.when.id]?.choice)))active.push(question);
 return active;
}
export function keepCompanyAnswers(answers:ReviewAnswers):ReviewAnswers{return Object.fromEntries(Object.entries(answers).filter(([id])=>contextQuestions.find(question=>question.id===id)?.scope==='company'));}
export function buildContextAnswer(question:ContextQuestion,choice:string,note:string,details:AnswerDetails={}):ReviewAnswer{
 const option=question.options.find(option=>option.id===choice);
 if(!option)throw new Error('답변을 선택해주세요.');
 const contact=details.contact&&(details.contact.department.trim()||details.contact.name.trim())?{department:details.contact.department.trim(),name:details.contact.name.trim()}:undefined;
 return {contact,choice,note:note.trim(),source:'user',scope:question.scope,status:option.followup||(option.needsDetails&&!note.trim())?'followup':'recorded',answeredAt:new Date().toISOString()};
}
export function contextEvidence(field:string|undefined,columns:Column[],mappings:Mapping[],rows:string[][]){
 if(!field)return null;
 const mapping=mappings.find(mapping=>mapping.field===field);const index=columns.findIndex(column=>column.id===mapping?.column);
 if(index<0)return {column:null,values:[] as string[]};
 return {column:columns[index].name,values:rows.slice(0,3).map(row=>row[index]??'').map(value=>value.slice(0,160))};
}
export function contextFollowups(answers:ReviewAnswers){return activeContextQuestions(answers).filter(question=>!answers[question.id]||answers[question.id].status==='followup');}
export function recordContextAnswer(answers:ReviewAnswers,id:string,answer:ReviewAnswer):ReviewAnswers{
 const next={...answers,[id]:answer};
 const active=new Set(activeContextQuestions(next).map(question=>question.id));
 return Object.fromEntries(Object.entries(next).filter(([key])=>active.has(key)));
}

export function confirmationRequest(question:ContextQuestion,note:string,contact?:{department:string;name:string}){
 const recipient=[contact?.department,contact?.name].filter(Boolean).join(' ');
 return `${recipient?recipient+' 담당자님, ':''}Cat 1 산정 준비를 위해 확인을 부탁드립니다.\n\n확인할 내용: ${question.request}${note.trim()?'\n참고: '+note.trim():''}\n\n확인된 기준과 관련 자료를 알려주세요.`;
}
