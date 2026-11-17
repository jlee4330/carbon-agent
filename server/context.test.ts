import {test} from 'node:test';
import assert from 'node:assert/strict';
import {contextInputKind,contextQuestions,activeContextQuestions,buildContextAnswer,keepCompanyAnswers,contextEvidence,contextFollowups,recordContextAnswer,type ReviewAnswers} from '../src/reviewContext.ts';
const question=(id:string)=>contextQuestions.find(q=>q.id===id)!;
const answer=(id:string,choice:string)=>buildContextAnswer(question(id),choice,'');
const set=(answers:ReviewAnswers,id:string,choice:string)=>recordContextAnswer(answers,id,answer(id,choice));
test('three-stage route starts with coverage and does not ask hidden followups',()=>{
 const route=activeContextQuestions({});assert.equal(route[0].id,'coverage');assert.deepEqual([...new Set(route.map(q=>q.stage))],[1,2,3]);
 assert.ok(!route.some(q=>q.when));assert.equal(contextFollowups({}).length,route.length);
 assert.ok(!contextQuestions.some(q=>['policy','organization','period','capital'].includes(q.id)));
});
test('missing scope branches ask only relevant details and discard obsolete answers',()=>{
 let answers=set(set({},'coverage','incomplete'),'missing_scope','both');let route=activeContextQuestions(answers);assert.ok(route.some(q=>q.id==='missing_period'));assert.ok(route.some(q=>q.id==='missing_site'));
 answers=set(answers,'missing_site','separate');answers=set(answers,'missing_period','none');
 answers=set(answers,'missing_scope','period');assert.equal(answers.missing_site,undefined);assert.ok(answers.missing_period);
 answers=set(answers,'coverage','complete');assert.equal(answers.missing_period,undefined);assert.ok(!contextFollowups(answers).some(q=>q.id==='missing_site'));
});
test('quantity discrepancies and packaging have independent conditional branches',()=>{
 let answers=set({},'quantity_difference','both');answers=set(answers,'unit_meaning','package');
 const ids=activeContextQuestions(answers).map(q=>q.id);for(const id of ['order_difference','invoice_difference','package_details'])assert.ok(ids.includes(id));
 answers=set(answers,'quantity_difference','same');assert.ok(!activeContextQuestions(answers).some(q=>q.id==='order_difference'||q.id==='invoice_difference'));assert.ok(activeContextQuestions(answers).some(q=>q.id==='package_details'));
});
test('uncertain answers do not activate extra questions or imply resolution',()=>{
 let answers=set({},'coverage','unknown');answers=set(answers,'product_details','unknown');
 assert.equal(answers.coverage.status,'followup');assert.equal(answers.coverage.source,'user');assert.ok(!activeContextQuestions(answers).some(q=>q.when));
 assert.ok(contextFollowups(answers).some(q=>q.id==='product_details'));assert.deepEqual(keepCompanyAnswers(answers),{});
});
test('product sources are recorded without requiring item-by-item manual input',()=>{
 let answers=set({},'product_details','coded');assert.ok(activeContextQuestions(answers).some(q=>q.id==='product_reference'));
 answers=set(answers,'product_reference','none');assert.equal(answers.product_reference.status,'followup');
 answers=set(answers,'product_details','sufficient');assert.equal(answers.product_reference,undefined);
});
test('source evidence keeps original values and does not substitute other quantities',()=>{
 const rows=[['0'],['100'],['200'],['900']];
 const columns=[{id:'c0',name:'입고량'}];const mappings=[{field:'receipt_quantity',column:'c0',status:'recommended' as const,reason:''}];
 assert.deepEqual(contextEvidence('receipt_quantity',columns,mappings,rows),{column:'입고량',values:['0','100','200']});
 assert.deepEqual(contextEvidence('quantity',columns,mappings,rows),{column:null,values:[]});assert.equal(contextEvidence(undefined,[],[],rows),null);
});
test('choices are validated and missing optional detail remains unresolved',()=>{
 assert.throws(()=>answer('coverage','invented'));
 assert.equal(answer('amount_basis','known').status,'followup');assert.equal(buildContextAnswer(question('amount_basis'),'known','부가세 제외').status,'recorded');
});
test('every conditional question is reachable and all question ids are unique',()=>{
 assert.equal(new Set(contextQuestions.map(q=>q.id)).size,contextQuestions.length);
 for(const q of contextQuestions){if(!q.when)continue;const parent=question(q.when.id);assert.ok(parent);assert.ok(contextQuestions.indexOf(parent)<contextQuestions.indexOf(q));for(const choice of q.when.choices){assert.ok(parent.options.some(o=>o.id===choice));const ancestors:ReviewAnswers={};let ancestor=parent;while(ancestor.when){ancestors[ancestor.when.id]=answer(ancestor.when.id,ancestor.when.choices[0]);ancestor=question(ancestor.when.id);}assert.ok(activeContextQuestions({...ancestors,[parent.id]:answer(parent.id,choice)}).some(item=>item.id===q.id));}}
});

test('available resources route to file column or text input, unknown answers never do',()=>{
 for(const id of ['missing_period','missing_site'])assert.equal(contextInputKind(question(id),'separate'),'file');
 for(const choice of ['master','spec'])assert.equal(contextInputKind(question('product_reference'),choice),'file');
 assert.equal(contextInputKind(question('product_reference'),'column'),'column');
 assert.equal(contextInputKind(question('amount_basis'),'known'),'text');
 assert.equal(contextInputKind(question('package_details'),'table'),'file');
 assert.equal(contextInputKind(question('product_reference'),'none'),null);
 for(const q of contextQuestions)assert.equal(contextInputKind(q,'unknown'),null);
});
test('attachments retain actual file contents in export and disappear with obsolete branches',()=>{
 let answers=set(set({},'coverage','incomplete'),'missing_scope','period');
 const resource={...answer('missing_period','separate'),support:{kind:'file' as const,files:[{name:'purchase.csv',size:3,dataUrl:'data:text/csv;base64,YSxi'}]}};
 answers=recordContextAnswer(answers,'missing_period',resource);
 const exported=JSON.parse(JSON.stringify(answers));assert.equal(exported.missing_period.support.files[0].dataUrl,resource.support.files[0].dataUrl);
 assert.ok(contextFollowups(answers).some(q=>q.id==='missing_period'));
 answers=set(answers,'coverage','complete');assert.equal(answers.missing_period,undefined);
});
test('per-unit mass and product unit factor take separate input paths',()=>{
 const mass=set({},'unit_meaning','package');assert.ok(activeContextQuestions(mass).some(q=>q.id==='package_details'));assert.ok(!activeContextQuestions(mass).some(q=>q.id==='unit_factor_details'));
 assert.equal(contextInputKind(question('package_details'),'known'),'text');
 const factor=set(mass,'unit_meaning','per_unit_factor');assert.ok(activeContextQuestions(factor).some(q=>q.id==='unit_factor_details'));assert.ok(!activeContextQuestions(factor).some(q=>q.id==='package_details'));
 assert.equal(contextInputKind(question('unit_factor_details'),'file'),'file');assert.equal(answer('unit_factor_details','file').status,'followup');
});
