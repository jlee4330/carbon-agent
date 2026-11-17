import {test} from 'node:test';
import assert from 'node:assert/strict';
import {classifyProducts,validateProductInputs,validateClassifications} from './productClassification.ts';
import {needsProductMeaning,mergeProductInputs,type ProductInput,type ProductClassification} from '../src/productClassification.ts';
import {EPA_SOURCE,type EmissionFactor} from '../src/factors.ts';
const product:ProductInput={id:'p1',code:'CHEM-001',name:'CHEM-001',supplier:'supplier',category:'원재료',details:[],userDescription:''};
const factor:EmissionFactor={id:'fixture',title:'Soap manufacturing',code:'325611',value:1,withMargins:2,source:EPA_SOURCE.id,year:2022,unit:EPA_SOURCE.unit,region:'US',boundary:'cradle-to-production'};
const known={...product,userDescription:'설비 세척에 사용하는 비누 기반 세정제'};
const classification:ProductClassification={id:'p1',status:'classified',productName:'비누 기반 세정제',material:'비누',use:'설비 세척',factorIds:['fixture'],reason:'사용자가 제품 종류와 용도를 설명했습니다.',question:''};
const config={apiKey:'test-only',model:'test-model'};
test('opaque codes ask the user without guessing or making an API call',async()=>{
 assert.equal(needsProductMeaning(product),true);assert.equal(needsProductMeaning(known),false);
 const result=await classifyProducts([product],[factor],config,new AbortController().signal,async()=>{throw new Error('must not call');});assert.equal(result[0].status,'needs_input');assert.match(result[0].question,/CHEM-001/);assert.deepEqual(result[0].factorIds,[]);
});
test('semantic classifier receives specifications and user meaning and selects only supplied catalog IDs',async()=>{
 let payload:any;
 const request=(async(_url,init)=>{payload=JSON.parse(String(init?.body));return new Response(JSON.stringify({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({products:[classification]})}]}]}));}) as typeof fetch;
 const result=await classifyProducts([known],[factor],config,new AbortController().signal,request);
 assert.equal(result[0].factorIds[0],'fixture');assert.equal(payload.store,false);const supplied=JSON.parse(payload.input[1].content);assert.equal(supplied.products[0].userDescription,known.userDescription);assert.equal(supplied.catalog[0].value,undefined);assert.match(payload.input[0].content,/untrusted/);
});
test('unknown or duplicated factor identifiers and missing products are rejected',()=>{
 assert.throws(()=>validateClassifications({products:[{...classification,factorIds:['invented']}]},[known],[factor]));
 assert.throws(()=>validateClassifications({products:[]},[known],[factor]));
 assert.throws(()=>validateClassifications({products:[{...classification,status:'needs_input'}]},[known],[factor]));
 assert.throws(()=>validateClassifications({products:[{...classification,factorIds:['fixture','fixture']}]},[known],[factor]));
});
test('failed and incomplete API responses are explicit errors, not search fallbacks',async()=>{
 for(const response of [new Response('failure',{status:401}),new Response(JSON.stringify({status:'incomplete'}))])await assert.rejects(classifyProducts([known],[factor],config,new AbortController().signal,(async()=>response) as typeof fetch));
});
test('product inputs are bounded and duplicate products reuse one identity while retaining different specifications',()=>{
 const merged=mergeProductInputs([{...product,details:['20%']},{...product,details:['30%']}]);assert.equal(merged.length,1);assert.deepEqual(merged[0].details,['20%','30%']);
 assert.throws(()=>validateProductInputs({products:Array.from({length:21},()=>product)}));assert.throws(()=>validateProductInputs({products:[product,product]}));assert.deepEqual(validateProductInputs({products:[known]}),[known]);
});
test('an unavailable catalog can still identify a product but cannot invent a factor',async()=>{
 const noMatch={...classification,status:'no_match',factorIds:[],reason:'제품은 식별했으나 연결된 계수 목록이 없습니다.'};
 const request=(async()=>new Response(JSON.stringify({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({products:[noMatch]})}]}]}))) as typeof fetch;
 const result=await classifyProducts([known],[],config,new AbortController().signal,request);assert.equal(result[0].productName,'비누 기반 세정제');assert.deepEqual(result[0].factorIds,[]);
});
