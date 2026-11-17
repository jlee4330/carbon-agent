import test from 'node:test';
import assert from 'node:assert/strict';
import {splitIdentityScreening} from '../src/identityScreening.js';
const product=(id:string,name:string,details:string[]=[])=>({id,name,code:id,supplier:'',category:'',details,userDescription:''});
test('obvious internal codes appear immediately without LLM calls or invented identities',()=>{
 const result=splitIdentityScreening([product('1','CHEM-001'),product('2','CHEM-002'),product('3','MAT-001')]);
 assert.equal(result.remaining.length,0);assert.deepEqual(result.immediate.map(g=>[g.label,g.ids]),[['CHEM 코드',['1','2']],['MAT 코드',['3']]]);
});
test('ambiguous abbreviations and codes with existing specifications still receive semantic review',()=>{
 const products=[product('1','IPA'),product('2','CHEM-001',['실제 제품 사양']),product('3','세척제')];
 const result=splitIdentityScreening(products);assert.deepEqual(result.remaining,products);assert.equal(result.immediate.length,0);
});
