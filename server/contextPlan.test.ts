import {test} from 'node:test';
import assert from 'node:assert/strict';
import {buildContextPlan,approvedQuantityMappings} from '../src/contextPlan.ts';
import {contextQuestions,buildContextAnswer} from '../src/reviewContext.ts';
import {groupPurchases} from '../src/grouping.ts';
import type {Mapping} from '../src/shared.ts';
const fields=['item','code','receipt_quantity','receipt_unit','order_quantity','order_unit','amount','currency','order_id','site'];
const columns=fields.map(id=>({id,name:id}));
const mappings:Mapping[]=fields.map(field=>({field,column:field,status:'recommended',reason:''}));
const row=(changes:Record<number,string>={})=>Object.assign(['철판 2mm','A1','80','kg','80','kg','1000','KRW','PO1','P100'],changes);
const answer=(id:string,choice:string)=>buildContextAnswer(contextQuestions.find(q=>q.id===id)!,choice,'');
test('clean data gets common checks, not every possible question',()=>{
 const tasks=buildContextPlan(columns,[row()],mappings,{});assert.deepEqual(tasks.map(t=>t.question.id),['coverage','product_details','quantity_basis','amount_basis']);
 assert.ok(tasks.find(t=>t.question.id==='quantity_basis')!.question.options.some(o=>o.id==='receipt'));
 assert.ok(!tasks.find(t=>t.question.id==='quantity_basis')!.question.options.some(o=>o.id==='invoice'));
});
test('thousands of repetitions create a single task with counted unique values',()=>{
 const rows=Array.from({length:6000},()=>row({0:'CHEM-001',1:'CHEM-001'}));
 const tasks=buildContextPlan(columns,rows,mappings,{});const products=tasks.filter(t=>t.question.id==='product_details');assert.equal(products.length,1);assert.deepEqual(products[0].examples,[{value:'CHEM-001',count:6000}]);assert.equal(products[0].rows.length,6000);
 assert.equal(tasks.filter(t=>t.question.id==='repeat_meaning').length,1);
});
test('quantity discrepancies compare only identical explicit units and keep source row references',()=>{
 const rows=[row({4:'100'}),row({4:'100',5:'t'}),row({4:'100',3:''})];
 const task=buildContextPlan(columns,rows,mappings,{}).find(t=>t.question.id==='quantity_difference');assert.deepEqual(task?.rows,[0]);
});
test('followups only appear after a relevant answer and preserve parent row scope',()=>{
 const rows=[row(),row({0:'CHEM-001'})];
 const before=buildContextPlan(columns,rows,mappings,{});assert.ok(!before.some(t=>t.question.id==='product_reference'));
 const after=buildContextPlan(columns,rows,mappings,{product_details:answer('product_details','coded')});assert.deepEqual(after.find(t=>t.question.id==='product_reference')?.rows,[1]);
 assert.ok(!buildContextPlan(columns,rows,mappings,{product_details:answer('product_details','sufficient')}).some(t=>t.question.id==='product_reference'));
});
test('no automatic quantity basis; explicit approval selects matching units for subsequent grouping',()=>{
 const rows=[row()];assert.equal(groupPurchases(columns,rows,approvedQuantityMappings(mappings,{}),[])[0].quantityReady,false);
 const approved=approvedQuantityMappings(mappings,{quantity_basis:answer('quantity_basis','receipt')});assert.equal(approved.find(m=>m.field==='quantity')?.column,'receipt_quantity');assert.equal(approved.find(m=>m.field==='unit')?.column,'receipt_unit');assert.equal(groupPurchases(columns,rows,approved,[])[0].quantityReady,true);
 assert.equal(groupPurchases(columns,rows,approvedQuantityMappings(mappings,{quantity_basis:answer('quantity_basis','varies')}),[])[0].quantityReady,false);
 const missingUnit=mappings.filter(m=>m.field!=='receipt_unit');assert.equal(groupPurchases(columns,rows,approvedQuantityMappings(missingUnit,{quantity_basis:answer('quantity_basis','receipt')}),[])[0].quantityReady,false);
});
test('numeric issues and conflicting identities are detected without changing original data',()=>{
 const rows=[row({2:'-5'}),row({0:'別の製品',2:'x',8:'PO2'})];const original=JSON.stringify(rows);const tasks=buildContextPlan(columns,rows,mappings,{});
 assert.deepEqual(tasks.find(t=>t.question.id==='numeric_quality')?.rows,[0,1]);assert.ok(!tasks.some(t=>t.question.id==='code_consistency'));assert.equal(JSON.stringify(rows),original);
});

test('product checks separate opaque codes, broad names and missing names',()=>{
 const rows=[row({0:'CHEM-001'}),row({0:'세척제',1:'B2'}),row({0:'',1:'C3'}),row({0:'철판 2mm',1:'D4'})];
 const tasks=buildContextPlan(columns,rows,mappings,{});
 assert.deepEqual(tasks.find(t=>t.question.id==='product_details')?.productIssues?.map(issue=>[issue.kind,issue.rows]),[['code',[0]],['broad',[1]],['missing',[2]]]);
 assert.ok(!tasks.some(t=>t.question.id==='code_consistency'));
});
test('code consistency question is omitted even when specifications differ',()=>{
 const extendedColumns=[...columns,{id:'specification',name:'규격'}];
 const extendedMappings:Mapping[]=[...mappings,{field:'specification',column:'specification',status:'recommended',reason:''}];
 const rows=[[...row(),'2mm'],[...row({8:'PO2'}),'3mm']];
 const tasks=buildContextPlan(extendedColumns,rows,extendedMappings,{});
 assert.ok(!tasks.some(t=>t.question.id==='code_consistency'));
});
test('coverage no leads directly to scope and only the selected followup',()=>{
 const no={coverage:answer('coverage','incomplete')};
 assert.deepEqual(buildContextPlan(columns,[row()],mappings,no).slice(0,2).map(t=>t.question.id),['coverage','missing_scope']);
 const period={...no,missing_scope:answer('missing_scope','period')};
 const tasks=buildContextPlan(columns,[row()],mappings,period);
 assert.deepEqual(tasks.slice(0,3).map(t=>t.question.id),['coverage','missing_scope','missing_period']);
 assert.ok(!tasks.some(t=>t.question.id==='missing_site'));
 const yes=buildContextPlan(columns,[row()],mappings,{coverage:answer('coverage','complete')});
 assert.ok(!yes.some(t=>['missing_scope','missing_period','missing_site'].includes(t.question.id)));
});
test('repeat confirmation appears only for detected records, without asking whether repeats exist',()=>{
 const clean=buildContextPlan(columns,[row(),row({8:'PO2',1:'B2',0:'철판 3mm'})],mappings,{});
 assert.ok(!clean.some(t=>['repeated_rows','repeat_meaning'].includes(t.question.id)));
 const noId=mappings.filter(m=>m.field!=='order_id');
 const repeated=buildContextPlan(columns,[row(),row()],noId,{});
 assert.deepEqual(repeated.find(t=>t.question.id==='repeat_meaning')?.rows,[0,1]);
 assert.ok(!repeated.some(t=>t.question.id==='repeated_rows'));
});
