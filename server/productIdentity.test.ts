import test from 'node:test';
import assert from 'node:assert/strict';
import {groupProductIdentities,validateIdentityGroups} from './productIdentity';
const products=[{id:'a',code:'1',name:'CHEM-001',supplier:'A',category:'',details:[],userDescription:''},{id:'b',code:'2',name:'CHEM-002',supplier:'A',category:'',details:[],userDescription:''}];
test('identity screening preserves every supplied product exactly once',()=>{
 const group={label:'CHEM 코드',ids:['a','b'],needsDetails:true};assert.deepEqual(validateIdentityGroups({groups:[group]},products),[group]);
 for(const ids of [['a'],['a','a'],['a','invented']])assert.throws(()=>validateIdentityGroups({groups:[{...group,ids}]},products));
});
test('LLM identity request receives unique product descriptions and validates response',async()=>{
 const mock:typeof fetch=async(_url,init)=>{const body=JSON.parse(String(init?.body));assert.deepEqual(JSON.parse(body.input[1].content),{products});assert.equal(body.store,false);return new Response(JSON.stringify({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({groups:[{label:'CHEM 코드',ids:['a','b'],needsDetails:true}]})}]}]}));};
 const result=await groupProductIdentities(products,{apiKey:'test',model:'test'},new AbortController().signal,mock);assert.equal(result[0].needsDetails,true);
});
test('incomplete identity model output is not treated as a successful screening',async()=>{
 await assert.rejects(groupProductIdentities(products,{apiKey:'test',model:'test'},new AbortController().signal,async()=>new Response(JSON.stringify({status:'incomplete'}))));
});
