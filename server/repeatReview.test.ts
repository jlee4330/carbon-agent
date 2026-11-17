import test from 'node:test';
import assert from 'node:assert/strict';
import {reviewRepeats,validateRepeatInput} from './repeatReview.js';
const input={columns:['구매번호','입고일'],rows:[['PO1','2025-01-01'],['PO1','2025-01-02']]};
test('repeat review uses bounded supplied candidates and returns a suggestion, not a decision',async()=>{
 const mock:typeof fetch=async (_url,init)=>{const body=JSON.parse(String(init?.body));assert.deepEqual(JSON.parse(body.input[1].content),input);assert.equal(body.store,false);return new Response(JSON.stringify({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({summary:'구매번호는 같고 입고일은 다릅니다. 분할 입고인지 확인해주세요.'})}]}]}));};
 const result=await reviewRepeats(input,{apiKey:'test',model:'test'},new AbortController().signal,mock);assert.match(result.summary,/입고일/);
});
test('repeat review rejects oversized inputs and incomplete model responses',async()=>{
 assert.throws(()=>validateRepeatInput({...input,rows:Array(13).fill(input.rows[0])}));
 assert.throws(()=>validateRepeatInput({...input,rows:[['x']]}));
 await assert.rejects(reviewRepeats(input,{apiKey:'test',model:'test'},new AbortController().signal,async()=>new Response(JSON.stringify({status:'incomplete'}))));
});
