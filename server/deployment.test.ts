import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Readable} from 'node:stream';
import {EventEmitter} from 'node:events';
import type {IncomingMessage,ServerResponse} from 'node:http';
import analyze from '../api/analyze';
import health from '../api/health';
import {requestChunks,allowedOrigin} from './http';
import {readApiJson} from '../src/apiResponse';

function request(url:string,body?:unknown){return Object.assign(Readable.from([]),{url,method:'POST',headers:{host:'carbon-agent-kappa.vercel.app',origin:'https://carbon-agent-kappa.vercel.app'},body}) as unknown as IncomingMessage;}
function response(){let status=0,text='';const res=Object.assign(new EventEmitter(),{destroyed:false,writeHead(code:number){status=code;},end(value:string){text=value;}});return {res:res as unknown as ServerResponse,result:()=>({status,data:JSON.parse(text)})};}
test('Vercel health entry accepts same-origin deployment requests and query strings',async()=>{
 const out=response();await health(request('/api/health?check=1'),out.res);assert.equal(out.result().status,200);assert.equal(typeof out.result().data.ready,'boolean');
});
test('Vercel parsed JSON body reaches validation instead of empty stream',async()=>{
 const out=response();await analyze(request('/api/analyze',{sheets:[]}),out.res);assert.equal(out.result().status,400);assert.match(out.result().data.error,/시트 1개/);
});
test('foreign origin remains rejected',()=>{const req=request('/api/health');req.headers.origin='https://other.example';assert.equal(allowedOrigin(req),false);});
test('body adapter preserves local stream and parsed Vercel payload',async()=>{
 for(const req of [Readable.from([Buffer.from('{"sheets":[]}')]),Object.assign(Readable.from([]),{body:{sheets:[]}})]){
  const chunks=[];for await(const chunk of requestChunks(req as IncomingMessage))chunks.push(chunk);assert.equal(Buffer.concat(chunks).toString(),'{"sheets":[]}');
 }
});
test('non-JSON 404 gives actionable error while API errors are preserved',async()=>{
 await assert.rejects(readApiJson(new Response('The page could not be found',{status:404})),/API.*404/);
 await assert.rejects(readApiJson(Response.json({error:'키를 설정해주세요'},{status:503})),/키를 설정해주세요/);
 assert.deepEqual(await readApiJson(Response.json({ready:true})),{ready:true});
});
