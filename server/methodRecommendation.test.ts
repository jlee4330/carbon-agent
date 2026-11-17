import {test} from 'node:test';
import assert from 'node:assert/strict';
import {recommendMethod} from '../src/methodRecommendation.ts';
import {EPA_SOURCE,type EmissionFactor,type MoneyBasis} from '../src/factors.ts';
import {groupPurchases,assignMethod} from '../src/grouping.ts';
const columns=[{id:'item',name:'item'},{id:'amount',name:'amount'},{id:'currency',name:'currency'}];
const mappings=columns.map(c=>({field:c.id,column:c.id,status:'recommended' as const,reason:''}));
const group=groupPurchases(columns,[['비누','100','USD']],mappings,[])[0];
const factor:EmissionFactor={id:'fixture',title:'Soap manufacturing',code:'325611',value:0.5,withMargins:0.6,source:EPA_SOURCE.id,unit:EPA_SOURCE.unit,year:2022,region:'US',boundary:'cradle-to-production'};
const basis:MoneyBasis={currency:'USD',purchaseYear:2022,usdPerCurrency:1,priceAdjustment:1,confirmed:true,evidence:'fixture'};
test('method is proposed from available factors without requiring a manual three-way choice',()=>{
 const result=recommendMethod(group,[factor]);assert.equal(result.method,'spend');assert.equal(result.needsReview,true);assert.ok(result.issues.some(issue=>issue.includes('범위')));assert.ok(result.issues.some(issue=>issue.includes('환산')));
});
test('missing catalog or opaque products never create a confident method recommendation',()=>{
 assert.equal(recommendMethod(group,[]).method,null);
 const opaque={...group,item:'CHEM-001',category:''};assert.equal(recommendMethod(opaque,[factor]).method,null);
 assert.equal(recommendMethod({...group,spendReady:false,quantityReady:true},[factor]).method,null);
});
test('ambiguous factor candidates are exposed and never auto-approved',()=>{
 const result=recommendMethod(group,[factor,{...factor,id:'fixture2',title:'Soap products'}]);assert.equal(result.method,'spend');assert.ok(result.issues.some(issue=>issue.includes('서로 다른')));assert.equal(result.needsReview,true);
});
test('calculated rows leave review queue while manual holds are preserved',()=>{
 const linked={factor,approvedAt:'2026-11-16',scopeConfirmed:true as const};
 const result=recommendMethod(group,[factor],linked,basis,assignMethod(group,'spend',''),[{dataRow:1,groupId:group.id,status:'calculated',kgCO2e:50,reason:'fixture'}]);assert.equal(result.needsReview,false);assert.equal(result.title,'산정 완료');
 assert.equal(recommendMethod(group,[factor],linked,basis,assignMethod(group,'hold','확인 중')).method,'hold');
 const pending=recommendMethod(group,[factor],linked,basis,assignMethod(group,'spend',''),[{dataRow:1,groupId:group.id,status:'conditions-required',kgCO2e:null,reason:'fixture'}]);assert.equal(pending.needsReview,true);assert.ok(pending.issues.some(issue=>issue.includes('공통 기준')));
});
