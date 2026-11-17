import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseEPAFactors,createFactorProvider} from './factors.js';
import {matchingUnreviewedGroups,EPA_SOURCE,factorCandidates,calculateEmissions,validMoneyBasis,type MoneyBasis,type FactorLink} from '../src/factors.js';
import {groupPurchases,assignMethod} from '../src/grouping.js';
import type {Mapping} from '../src/shared.js';
// Synthetic fixture values exercise the parser/calculator; never used by the application as emission factors.
const header='2017 NAICS Code,2017 NAICS Title,GHG,Unit,Supply Chain Emission Factors without Margins,Margins of Supply Chain Emission Factors,Supply Chain Emission Factors with Margins,Reference USEEIO Code';
const csv=header+'\n325611,"Soap, cleaning manufacturing",All,kg CO2e/2022 USD,0.5,0.1,0.6,fixture';
const factors=parseEPAFactors(csv);
const columns=[{id:'a',name:'Amount'},{id:'c',name:'Currency'},{id:'i',name:'Item'}];
const mappings:Mapping[]=[{field:'amount',column:'a',status:'recommended',reason:''},{field:'currency',column:'c',status:'recommended',reason:''},{field:'item',column:'i',status:'recommended',reason:''}];
const rows=[['1000','KRW','비누'],['0','KRW','비누']];
const groups=groupPurchases(columns,rows,mappings,[]),id=groups[0].id;
const decisions={[id]:assignMethod(groups[0],'spend','')};
const links:Record<string,FactorLink>={[id]:{factor:factors[0],approvedAt:'2026-11-16',scopeConfirmed:true}};
const basis:MoneyBasis={currency:'KRW',purchaseYear:2025,usdPerCurrency:0.001,priceAdjustment:0.9,evidence:'Test fixture only: FX and price-index sources',confirmed:true};
test('official CSV schema retains SEF and margins separately and rejects malformed units or duplicates',()=>{
 assert.equal(factors[0].value,0.5);assert.equal(factors[0].withMargins,0.6);assert.equal(factors[0].source,EPA_SOURCE.id);assert.equal(factors[0].title,'Soap, cleaning manufacturing');
 for(const text of [csv.replace('kg CO2e/2022 USD','kg CH4/USD'),csv.replace(',0.5,',',unknown,'),csv+'\n'+csv.split('\n')[1],'<html>Error</html>',header])assert.throws(()=>parseEPAFactors(text));
});
test('candidate search supports Korean aliases but never guesses from opaque item codes',()=>{
 assert.equal(factorCandidates('비누',factors)[0].id,factors[0].id);assert.equal(factorCandidates('325611',factors)[0].id,factors[0].id);assert.deepEqual(factorCandidates('CHEM-001',factors),[]);assert.deepEqual(factorCandidates('',factors),[]);
});
test('calculation uses approved factors and explicit currency AND price normalization; zero is preserved',()=>{
 const result=calculateEmissions(groups,decisions,links,{KRW:basis},columns,rows,mappings);
 assert.equal(result[0].normalizedUSD2022,0.9);assert.equal(result[0].kgCO2e,0.45);assert.equal(result[1].kgCO2e,0);assert.deepEqual(result.map(r=>r.dataRow),[1,2]);
});
test('missing approval, factor, conversion and unresolved conditions never produce emissions',()=>{
 assert.equal(calculateEmissions(groups,{},links,{KRW:basis},columns,rows,mappings)[0].status,'unreviewed');
 assert.equal(calculateEmissions(groups,decisions,{}, {KRW:basis},columns,rows,mappings)[0].status,'factor-required');
 assert.equal(calculateEmissions(groups,decisions,links,{},columns,rows,mappings)[0].status,'basis-required');
 const blocked=calculateEmissions(groups,decisions,links,{KRW:basis},columns,rows,mappings,new Set([0]));assert.equal(blocked[0].status,'conditions-required');assert.equal(blocked[0].kgCO2e,null);assert.equal(blocked[1].kgCO2e,0);
});
test('invalid monetary normalization is rejected',()=>{
 for(const modified of [{confirmed:false},{usdPerCurrency:0},{priceAdjustment:NaN},{evidence:''},{purchaseYear:2022,priceAdjustment:0.9},{currency:'USD',usdPerCurrency:0.2}]){const b={...basis,...modified};assert.equal(validMoneyBasis(b,b.currency),false);}
 assert.equal(validMoneyBasis({...basis,purchaseYear:2022,priceAdjustment:1},'KRW'),true);
});
test('negative and invalid amounts are retained as uncalculated, not made positive',()=>{
 for(const amount of ['-10','oops','']){const altered=[[amount,'KRW','비누']];const result=calculateEmissions(groups,decisions,links,{KRW:basis},columns,altered,mappings);assert.equal(result[0].status,'invalid-amount');assert.equal(result[0].kgCO2e,null);}
});
test('provider deduplicates loads, validates fixed catalog size and records provenance',async()=>{
 const full=header+'\n'+Array.from({length:1016},(_,i)=>`${100000+i},Fixture,All,kg CO2e/2022 USD,0.5,0.1,0.6,fixture`).join('\n');let calls=0;
 const provider=createFactorProvider((async()=>{calls++;return new Response(full);}) as typeof fetch);
 const [one,two]=await Promise.all([provider(),provider()]);assert.equal(calls,1);assert.equal(one.factors.length,1016);assert.equal(one.sha256.length,64);assert.deepEqual(one,two);
});
test('provider errors do not become a fabricated fallback and can be retried',async()=>{
 let calls=0;const provider=createFactorProvider((async()=>{calls++;return new Response('Unavailable',{status:503});}) as typeof fetch);
 await assert.rejects(provider());await assert.rejects(provider());assert.equal(calls,2);
 await assert.rejects(createFactorProvider((async()=>new Response(csv)) as typeof fetch)());
});

test('shared factor approval only targets identical identified products and never overwrites reviewed methods',()=>{
 const target={...groups[0],code:'A1',item:'비누',category:'소모품',spendReady:true};
 const another={...target,id:'another',supplier:'다른 공급처'};
 const candidates=[target,another,{...target,id:'other-name',item:'세척제'},{...target,id:'other-category',category:'기계'},{...target,id:'manual-rule',ruleId:'rule'},{...target,id:'conflict',conflictingIdentity:true}];
 assert.deepEqual(matchingUnreviewedGroups(target,candidates,{}).map(g=>g.id),[target.id,'another']);
 assert.deepEqual(matchingUnreviewedGroups(target,candidates,{[target.id]:assignMethod(target,'hold','검토')} ).map(g=>g.id),['another']);
});
