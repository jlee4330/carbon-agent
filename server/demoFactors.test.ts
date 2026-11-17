import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DEMO_FACTORS,calculateDemo} from '../src/demoFactors.js';
import {calculateEmissions} from '../src/factors.js';
import {groupPurchases,assignMethod} from '../src/grouping.js';
const columns=['item','amount','currency','receipt_date','purchase_type','major_category','eeio_category','vat_included'].map(id=>({id,name:id}));
const mappings=columns.map(c=>({field:c.id,column:c.id,status:'recommended' as const,reason:''}));
const rows=[['세정제','1000','KRW','2025-01-01','일반 구매','부자재','cleaning','제외'],['세정제','2000','KRW','2025-01-02','일반 구매','부자재','cleaning','제외']];
const groups=groupPurchases(columns,rows,mappings,[]),id=groups[0].id;
const decisions={[id]:assignMethod(groups[0],'spend','시연')};
const links={[id]:{factor:DEMO_FACTORS[0],scopeConfirmed:true as const,approvedAt:'test'}};
test('demo produces traceable examples with explicit demonstration labels',()=>{
 const results=calculateDemo(groups,decisions,links,columns,rows,mappings);assert.equal(results.length,2);assert.ok(Math.abs(results[0].kgCO2e!-0.12)<1e-12);assert.ok(Math.abs(results[1].kgCO2e!-0.24)<1e-12);assert.ok(results.every(r=>r.reason.includes('실제 배출량 아님')));
});
test('production calculator cannot accept demo factors',()=>{
 assert.equal(calculateEmissions(groups,decisions,links,{},columns,rows,mappings)[0].status,'factor-required');
});
test('demo does not guess currencies or mutate original amounts and ignores forged factor values',()=>{
 const original=JSON.stringify(rows);const forged={[id]:{...links[id],factor:{...DEMO_FACTORS[0],value:999}}};assert.ok(Math.abs(calculateDemo(groups,decisions,forged,columns,rows,mappings)[0].kgCO2e!-0.12)<1e-12);assert.equal(JSON.stringify(rows),original);
 const usdRows=rows.map(r=>r.map((v,i)=>i===2?'USD':v));assert.equal(calculateDemo(groups,decisions,links,columns,usdRows,mappings)[0].status,'basis-required');
 assert.equal(calculateDemo(groups,decisions,links,columns,[['세정제','-1','KRW']],mappings)[0].kgCO2e,null);
});
test('unresolved conditions block only affected rows even with an approved factor',()=>{
 const results=calculateDemo(groups,decisions,links,columns,rows,mappings,new Set([0]));
 assert.equal(results[0].status,'conditions-required');assert.equal(results[0].kgCO2e,null);
 assert.equal(results[1].status,'calculated');
});
