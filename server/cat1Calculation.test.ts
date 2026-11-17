import test from 'node:test';
import assert from 'node:assert/strict';
import {cat1Row,cat1Readiness,chooseCat1Method} from '../src/cat1Calculation.js';
import {groupPurchases,type GroupDecision} from '../src/grouping.js';
import {calculateDemo,DEMO_FACTORS} from '../src/demoFactors.js';
const ids=['receipt_date','item','purchase_type','major_category','material_composition','receipt_weight','weight_unit','eeio_category','amount','currency','amount_krw','vat_included','tax'];
const columns=ids.map(id=>({id,name:id})),maps=ids.map(id=>({field:id,column:id,status:'recommended' as const,reason:''}));
const row=(changes:Partial<Record<string,string>>={})=>ids.map(id=>changes[id]??({receipt_date:'2025-01-01',item:'철판',purchase_type:'일반 구매',major_category:'원료 물질',material_composition:'철 100%',receipt_weight:'1000',weight_unit:'g',eeio_category:'steel',amount:'1100',currency:'KRW',amount_krw:'',vat_included:'포함',tax:'100'} as Record<string,string>)[id]);
const group=(rows:string[][])=>groupPurchases(columns,rows,maps,[])[0];
test('both complete methods prefer weight, with cost fallback only when eligible',()=>{
 const rows=[row()];const readiness=cat1Readiness(group(rows),columns,rows,maps);
 assert.equal(chooseCat1Method(readiness,['spend','weight']),'weight');
 assert.equal(chooseCat1Method(readiness,['spend']),'spend');
 const noWeight=[row({material_composition:''})];assert.equal(chooseCat1Method(cat1Readiness(group(noWeight),columns,noWeight,maps),['spend','weight']),'spend');
 const neither=[row({material_composition:'',eeio_category:''})];assert.equal(chooseCat1Method(cat1Readiness(group(neither),columns,neither,maps),['spend','weight']),null);
});
test('weight normalizes only explicit mass units, not EA or liters',()=>{
 assert.equal(cat1Row(row(),columns,maps).kg,1);
 assert.equal(cat1Row(row({receipt_weight:'2',weight_unit:'t'}),columns,maps).kg,2000);
 for(const unit of ['EA','L',''])assert.ok(cat1Row(row({weight_unit:unit}),columns,maps).weightIssues.length);
 assert.ok(cat1Row(row({receipt_weight:'-1'}),columns,maps).weightIssues.length);
});
test('cost needs EEIO currency KRW and VAT; no guessed exchange or VAT rate',()=>{
 assert.equal(cat1Row(row(),columns,maps).krw,1000);
 assert.ok(cat1Row(row({currency:'USD',amount_krw:''}),columns,maps).spendIssues.includes('원화 기준 구매금액'));
 assert.ok(cat1Row(row({vat_included:'포함',tax:''}),columns,maps).spendIssues.includes('원화 VAT 금액(제외 계산용)'));
 assert.ok(cat1Row(row({vat_included:''}),columns,maps).spendIssues.includes('VAT 포함 여부'));
 assert.equal(cat1Row(row({currency:'USD',amount_krw:'150000',vat_included:'제외'}),columns,maps).krw,150000);
 assert.ok(cat1Row(row({tax:'1200'}),columns,maps).spendIssues.length);
});
test('common requirements and capital goods prevent Cat 1 recommendations',()=>{
 for(const change of [{receipt_date:''},{purchase_type:''},{purchase_type:'자본재'},{major_category:''}]){const rows=[row(change)];assert.equal(chooseCat1Method(cat1Readiness(group(rows),columns,rows,maps),['weight','spend']),null);}
});
test('manual common criteria preserve raw values and differing compositions require review',()=>{
 const rows=[row(),row({material_composition:'다른 성분'})],original=JSON.stringify(rows);
 assert.equal(cat1Readiness(group(rows),columns,rows,maps).weightReady,false);
 assert.equal(cat1Readiness(group(rows),columns,rows,maps,{material_composition:'사용자 확인 구성'}).weightReady,true);
 assert.equal(JSON.stringify(rows),original);
});
test('one approved method computes once per row with matching factor units',()=>{
 const rows=[row()],g=group(rows),factor=DEMO_FACTORS.find(f=>f.code==='steel'&&f.basis==='weight')!;
 const decision:GroupDecision={method:'quantity',confirmed:true,note:'test'};
 const links={[g.id]:{factor,scopeConfirmed:true as const,approvedAt:'test'}};
 const result=calculateDemo([g],{[g.id]:decision},links,columns,rows,maps);
 assert.equal(result.length,1);assert.equal(result[0].method,'weight');assert.equal(result[0].activityValue,1);assert.equal(result[0].kgCO2e,1.8);
 const wrong=calculateDemo([g],{[g.id]:{...decision,method:'spend'}},links,columns,rows,maps);assert.equal(wrong[0].status,'factor-required');
 const capital=calculateDemo([g],{[g.id]:decision},links,columns,[row({purchase_type:'자본재'})],maps);assert.equal(capital[0].status,'held');
});
