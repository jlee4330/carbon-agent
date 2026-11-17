import test from 'node:test';
import assert from 'node:assert/strict';
import {periodEvidence} from '../src/periodEvidence.js';
import {activeContextQuestions,type ReviewAnswer} from '../src/reviewContext.js';
const columns=[{id:'d',name:'입고일'}];const mappings=[{field:'receipt_date',column:'d',status:'recommended' as const,reason:''}];
test('period proposal scans all rows and preserves mapped date semantics',()=>{
 const p=periodEvidence(columns,[['2025-06-01'],['2025-12-31'],['2025-01-01']],mappings)!;
 assert.equal(p.start,'2025-01-01');assert.equal(p.end,'2025-12-31');assert.equal(p.field,'receipt_date');assert.equal(p.complete,true);
});
test('column-wide date evidence disambiguates slash dates but ambiguous or invalid data is not complete',()=>{
 const p=periodEvidence(columns,[['4/4/25'],['4/17/25']],mappings)!;assert.equal(p.complete,true);assert.equal(p.end,'2025-04-17');assert.equal(p.twoDigitYear,true);
 assert.equal(periodEvidence(columns,[['4/5/25']],mappings)?.complete,false);
 assert.equal(periodEvidence(columns,[['2025-02-30'],['2025-01-01']],mappings)?.complete,false);
 assert.equal(periodEvidence(columns,[['2025-01-01'],['']],mappings)?.complete,false);
 assert.equal(periodEvidence(columns,[['2025-01-01']],[]),null);
});
test('a wider user-confirmed period activates missing-period followup',()=>{
 const answer:ReviewAnswer={choice:'complete',note:'',source:'user',scope:'dataset',status:'recorded',answeredAt:'test',period:{start:'2025-01-01',end:'2025-12-31',columnId:'d',dateField:'receipt_date',source:'user',observedStart:'2025-04-01',observedEnd:'2025-12-31'}};
 assert.ok(activeContextQuestions({coverage:answer}).some(q=>q.id==='missing_period'));
 answer.period!.start='2025-04-01';assert.ok(!activeContextQuestions({coverage:answer}).some(q=>q.id==='missing_period'));
});
