import {test} from 'node:test';
import assert from 'node:assert/strict';
import {groupPurchases,assignMethod,transactionAssignments,numericValue,type GroupRule,type GroupDecision} from '../src/grouping.ts';
import type {Mapping} from '../src/shared.ts';
const fields=['code','item','supplier','quantity','unit','amount','currency','category'];
const columns=fields.map((name,index)=>({id:`c${index}`,name}));
const mappings:Mapping[]=fields.map((field,index)=>({field,column:`c${index}`,status:'recommended',reason:''}));
const row=(changes:Record<number,string>={})=>Object.assign(['001','판재','공급사','10','kg','1,000','KRW','원재료'],changes);
test('every transaction belongs to exactly one group; units currencies and identity remain distinct',()=>{
 const rows=[row(),row(),row({4:'t'}),row({6:'USD'}),row({2:'다른 공급사'}),row({0:'',1:''}),row({0:'',1:''}),row({4:'mW'}),row({4:'MW'})];
 const groups=groupPurchases(columns,rows,mappings,[]);
 assert.equal(groups.length,8);assert.deepEqual(groups.flatMap(group=>group.rowIndices).sort((a,b)=>a-b),rows.map((_,i)=>i));assert.equal(groups[0].rowIndices.length,2);
});
test('ordered rules merge aliases but never mix units or currencies',()=>{
 const rows=[row(),row({1:'다른 표기'}),row({4:'t'})];
 const rules:GroupRule[]=[{id:'first',column:'c0',operator:'equals',value:'001',label:'사용자 판재'},{id:'second',column:'c0',operator:'contains',value:'00',label:'기타'}];
 const groups=groupPurchases(columns,rows,mappings,rules);assert.equal(groups.length,2);assert.equal(groups[0].rowIndices.length,2);assert.equal(groups[0].ruleId,'first');
 assert.equal(groupPurchases(columns,rows,mappings,[...rules].reverse())[0].ruleId,'second');
 const exception={id:'exception',column:'__row__',operator:'equals' as const,value:'2',label:'별도 확인'};
 assert.equal(groupPurchases(columns,rows,mappings,[exception,...rules]).length,3);
});
test('method selection checks all member rows and requires a hold reason',()=>{
 const group=groupPurchases(columns,[row(),row({3:'알 수 없음'})],mappings,[])[0];
 assert.equal(group.quantityReady,false);assert.equal(group.spendReady,true);
 assert.throws(()=>assignMethod(group,'quantity',''));assert.throws(()=>assignMethod(group,'supplier',''));assert.throws(()=>assignMethod(group,'hold',' '));
 assert.equal(assignMethod(group,'spend','검토').method,'spend');assert.equal(assignMethod(group,'hold','자료 확인').note,'자료 확인');
});
test('numeric checks keep zero and negatives but reject ambiguous representations',()=>{
 assert.equal(numericValue('1,234.50'),1234.5);assert.equal(numericValue('0'),0);assert.equal(numericValue('-10'),-10);
 for(const value of ['', '12,34','10kg','1.234,56','NaN'])assert.equal(numericValue(value),null);
 assert.equal(groupPurchases(columns,[row({3:'-2'})],mappings,[])[0].negativeRows,1);
});
test('method replacement exports only one assignment per transaction and tracks pending rows',()=>{
 const groups=groupPurchases(columns,[row(),row(),row({1:'별도 품목'})],mappings,[]);
 const decisions:Record<string,GroupDecision>={[groups[0].id]:assignMethod(groups[0],'quantity','')};
 decisions[groups[0].id]=assignMethod(groups[0],'spend','변경');
 const assignments=transactionAssignments(groups,decisions);assert.equal(assignments.length,3);assert.deepEqual(assignments.map(item=>item.method),['spend','spend',null]);assert.equal(assignments[2].status,'unreviewed');assert.equal(assignments[0].status,'factor-required');
});
