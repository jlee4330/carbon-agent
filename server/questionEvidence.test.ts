import test from 'node:test';
import assert from 'node:assert/strict';
import {questionEvidence} from '../src/questionEvidence';
import {contextQuestions} from '../src/reviewContext';
import type {Mapping} from '../src/shared';
const columns=[{id:'a',name:'GR Posting Date'},{id:'b',name:'Plant'},{id:'c',name:'Amount'}];
const mappings:Mapping[]=[{field:'receipt_date',column:'a',status:'recommended',reason:''},{field:'site',column:'b',status:'recommended',reason:''},{field:'amount',column:'c',status:'recommended',reason:''}];
const q=(id:string)=>contextQuestions.find(q=>q.id===id)!;
test('period evidence uses mapped dates, never plant codes or arbitrary headers',()=>{
 const evidence=questionEvidence(q('coverage'),columns,mappings,[['2025-12-03','P1','100'],['2025-01-02','P2','200']]);
 assert.equal(evidence.length,1);assert.equal(evidence[0].column,'GR Posting Date');assert.equal(evidence[0].range,'2025-01-02 ~ 2025-12-03');
 assert.equal(questionEvidence(q('coverage'),columns,[],[]).length,0);
});
test('invalid and ambiguous dates are not silently interpreted',()=>{
 const [evidence]=questionEvidence(q('coverage'),columns,mappings,[['4/5/25'],['2025-02-30'],['']]);
 assert.equal(evidence.range,null);assert.equal(evidence.incomplete,true);
});
test('each question follows its own mappings and values',()=>{
 assert.equal(questionEvidence(q('missing_site'),columns,mappings,[['2025-01-01','P1','100']])[0].column,'Plant');
 const result=questionEvidence(q('amount_basis'),columns,mappings,[['2025-01-01','P1','100']]);
 assert.equal(result.length,1);assert.deepEqual(result[0].examples,['100']);
});
