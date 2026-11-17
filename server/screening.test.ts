import {test} from 'node:test';
import assert from 'node:assert/strict';
import {screeningSession,screeningQuestions,type ScreeningId} from '../src/screening.js';
function complete(choices:Partial<Record<ScreeningId,boolean>>){const answers:boolean[]=[];while(screeningSession(answers).current){const id=screeningSession(answers).current!;answers.push(choices[id]??false);assert.ok(answers.length<=15);}return screeningSession(answers);}
test('no branches skip warehouse, trade ownership and asset control questions',()=>{
 const result=complete({});assert.deepEqual(result.entries.map(entry=>entry.id),['1.1','1.2','1.5','2.1','2.2','3.1','4.1','5.1']);assert.deepEqual(result.categories,[1,11]);assert.equal(result.scope12,false);
});
test('rented warehouse outside operational control and customer-paid delivery are classified',()=>{
 const result=complete({'1.1':true,'1.2':true,'1.3':true,'2.1':true,'3.1':true,'4.1':true,'5.1':true});assert.deepEqual(result.categories,[1,4,8,9,10,13]);assert.equal(result.scope12,false);
});
test('operational control routes warehouse and assets to scope 1 and 2',()=>{
 const result=complete({'1.2':true,'1.3':true,'1.4':true,'3.1':true,'3.2':true,'4.1':true,'4.2':true});assert.ok(result.scope12);assert.ok(!result.categories.includes(8));assert.ok(!result.categories.includes(13));
});
test('trade without ownership excludes Cat 1 and split delivery yields Cat 4 and 9',()=>{
 const result=complete({'1.5':true,'5.1':true,'5.2':true});assert.deepEqual(result.categories,[4,9,11]);assert.ok(!result.entries.some(entry=>entry.id==='5.3'));
});
test('returning to earlier answer drops downstream classifications',()=>{
 const before=screeningSession([true,true,true,false]);assert.ok(before.categories.includes(8));const after=screeningSession([false,false]);assert.deepEqual(after.categories,[1]);assert.equal(after.current,'1.5');
});
test('every branch terminates and all questions and outcomes are reachable',()=>{
 const seen=new Set<ScreeningId>();let finished=0;
 function visit(answers:boolean[]){const session=screeningSession(answers);if(!session.current){finished++;return;}assert.ok(answers.length<15);assert.equal(new Set(session.entries.map(entry=>entry.id)).size,answers.length);seen.add(session.current);visit([...answers,true]);visit([...answers,false]);}
 visit([]);assert.equal(seen.size,Object.keys(screeningQuestions).length);assert.ok(finished>100);
});
