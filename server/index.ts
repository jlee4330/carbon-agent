import {groupProductIdentities} from './productIdentity';
import {reviewRepeats,validateRepeatInput} from './repeatReview';
import {DEMO_FACTORS} from '../src/demoFactors';
import {validateProductInputs,classifyProducts} from './productClassification';
import {createFactorProvider} from './factors';
import {createServer,type ServerResponse} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {inputSchema} from './schema.ts';
import {loadConfig} from './config.ts';
import {sampleTable} from './sampling.ts';
import {AnalysisError,analyzeTable,type Table} from './analysis.ts';

const send=(res:ServerResponse,status:number,data:unknown)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
const loadFactors=createFactorProvider();
let busy=false;
const server=createServer(async(req,res)=>{
 const origin=req.headers.origin;if(origin&&!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)){send(res,403,{error:'허용되지 않은 요청입니다.'});return;}
 if(req.url==='/api/product-identities'&&req.method==='POST'){
  const controller=new AbortController();res.on('close',()=>controller.abort());
  try{let size=0;const chunks:Buffer[]=[];for await(const chunk of req){size+=chunk.length;if(size>1000000){send(res,413,{error:'요청이 너무 큽니다.'});return;}chunks.push(Buffer.from(chunk));}
   let products;try{products=validateProductInputs(JSON.parse(Buffer.concat(chunks).toString('utf8')));}catch{send(res,400,{error:'품목 입력 형식을 확인해주세요.'});return;}
   const groups=await groupProductIdentities(products,loadConfig(),controller.signal);if(!res.destroyed)send(res,200,{groups});
  }catch(error){if(!res.destroyed)send(res,502,{error:error instanceof Error?error.message:'품목 검사 실패'});}return;
 }
 if(req.url==='/api/review-repeats'&&req.method==='POST'){
  const controller=new AbortController();res.on('close',()=>controller.abort());
  try{let size=0;const chunks:Buffer[]=[];for await(const chunk of req){size+=chunk.length;if(size>150000){send(res,413,{error:'요청이 너무 큽니다.'});return;}chunks.push(Buffer.from(chunk));}
   let input;try{input=validateRepeatInput(JSON.parse(Buffer.concat(chunks).toString('utf8')));}catch{send(res,400,{error:'반복 후보 입력 형식을 확인해주세요.'});return;}
   const result=await reviewRepeats(input,loadConfig(),controller.signal);if(!res.destroyed)send(res,200,result);
  }catch(error){if(!res.destroyed)send(res,502,{error:error instanceof Error?error.message:'반복 후보 검토 실패'});}return;
 }
 if(req.url==='/api/classify-products'&&req.method==='POST'){
  const controller=new AbortController();res.on('close',()=>controller.abort());
  try{let size=0;const chunks:Buffer[]=[];for await(const chunk of req){size+=chunk.length;if(size>1000000){send(res,413,{error:'품목 요청이 너무 큽니다.'});return;}chunks.push(Buffer.from(chunk));}
   let products;let useCatalog=false;let demo=false;try{const input=JSON.parse(Buffer.concat(chunks).toString('utf8'));products=validateProductInputs(input);useCatalog=input.useCatalog===true;demo=input.catalogSource==='demo-example';}catch{send(res,400,{error:'품목 입력 형식을 확인해주세요.'});return;}
   let catalog:Awaited<ReturnType<typeof loadFactors>>|undefined;try{if(useCatalog&&!demo)catalog=await loadFactors();}catch{}
   const results=await classifyProducts(products,demo?DEMO_FACTORS:catalog?.factors??[],loadConfig(),controller.signal);
   if(!res.destroyed)send(res,200,{products:results,catalogAvailable:demo||Boolean(catalog)});
  }catch(error){if(!res.destroyed)send(res,502,{error:error instanceof Error?error.message:'품목 의미 분류에 실패했습니다.'});}return;
 }
 if(req.url==='/api/factors'&&req.method==='GET'){try{send(res,200,await loadFactors());}catch{send(res,503,{error:'공식 업계 평균 계수를 불러오지 못했습니다. 네트워크 연결을 확인한 뒤 다시 시도해주세요. 임의의 계수는 사용하지 않습니다.'});}return;}
 if(req.url==='/api/health'){send(res,200,{ready:Boolean(loadConfig().apiKey),model:loadConfig().model});return;}
 if(req.url==='/api/analyze'&&req.method==='POST'){
 let body='';try{const chunks:Buffer[]=[];let bytes=0;for await(const chunk of req){const buffer=Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk);bytes+=buffer.length;if(bytes>50*1024*1024){send(res,413,{error:'전체 데이터 요청이 50MB를 초과합니다. 파일을 나누어 분석해주세요.'});return;}chunks.push(buffer);}body=Buffer.concat(chunks).toString('utf8');}catch{return;}
 let value:unknown;try{value=JSON.parse(body);}catch{send(res,400,{error:'요청 형식을 확인해주세요.'});return;}
 const incoming=value as {sheets?:unknown[]};
 if(!incoming||!Array.isArray(incoming.sheets)||incoming.sheets.length!==1){send(res,400,{error:'분석할 시트 1개를 선택해주세요.'});return;}
 const tables:Table[]=[];
 for(const sheet of incoming.sheets){const table=sheet as Table;const parsed=inputSchema.safeParse(sheet);if(!parsed.success||typeof table.name!=='string'||table.name.length>200||!Number.isInteger(table.header)||table.header<0){send(res,400,{error:'시트의 데이터 형식 또는 크기를 확인해주세요. 데이터가 생략되지 않도록 요청을 중단했습니다.'});return;}tables.push({name:table.name,header:table.header,...parsed.data});}
 if(new Set(tables.map(t=>t.name)).size!==tables.length){send(res,400,{error:'시트명이 중복되었습니다.'});return;}
 const config=loadConfig();
 if(!config.apiKey){send(res,503,{error:'서버의 .env에 API 키가 없습니다.'});return;}
 if(busy){send(res,429,{error:'다른 분석이 진행 중입니다. 잠시 후 다시 시도해주세요.'});return;}
 busy=true;
 const controller=new AbortController();res.on('close',()=>controller.abort());
 res.writeHead(200,{'Content-Type':'application/x-ndjson; charset=utf-8','Cache-Control':'no-store','X-Accel-Buffering':'no'});
 const emit=(event:unknown)=>{if(!res.destroyed)res.write(JSON.stringify(event)+'\n');};
 const heartbeat=setInterval(()=>emit({type:'heartbeat'}),15000);
 try{
 const totalRows=tables.reduce((sum,t)=>sum+sampleTable(t).table.rows.length,0);let completed=0;const reviews=[];
 for(const table of tables){emit({type:'progress',sheet:table.name,processed:completed,total:totalRows});const review=await analyzeTable(table,config,controller.signal,(count)=>emit({type:'progress',sheet:table.name,processed:completed+count,total:totalRows}));reviews.push(review);completed+=review.sampledRowCount;}
 emit({type:'result',reviews,totalRows:completed});
 }catch(error){if(!controller.signal.aborted){const known=error instanceof AnalysisError;emit({type:'error',code:known?error.code:'ANALYSIS_FAILED',error:known?error.message:'AI 연결 또는 응답 검증에 실패했습니다. 전체 분석은 완료되지 않았습니다. 네트워크 상태를 확인하고 다시 시도해주세요.'});}}
 finally{clearInterval(heartbeat);busy=false;res.end();}return;
 }

 if(req.url?.startsWith('/api/')){send(res,404,{error:'없는 API입니다.'});return;}
 try{const root=resolve('dist');const pathname=decodeURIComponent(new URL(req.url||'/', 'http://localhost').pathname);const file=resolve(root,'.'+(pathname==='/'?'/index.html':pathname));if(!file.startsWith(root+sep)){send(res,403,{error:'Forbidden'});return;}if(!(await stat(file)).isFile())throw new Error();const mime:Record<string,string>={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.xlsx':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'};res.writeHead(200,{'Content-Type':mime[extname(file)]||'application/octet-stream','X-Content-Type-Options':'nosniff'});res.end(await readFile(file));}catch{send(res,404,{error:'페이지를 찾지 못했습니다. npm run build 또는 npm run dev를 실행해주세요.'});}
});
server.on('error',(error:NodeJS.ErrnoException)=>{console.error(error.code==='EADDRINUSE'?'포트가 사용 중입니다. .env의 PORT를 확인해주세요.':'서버를 실행할 수 없습니다. 로컬 터미널에서 npm run dev를 실행해주세요.');process.exitCode=1;});
server.listen(loadConfig().port,'127.0.0.1',()=>console.log(`Carbon Agent 1 API http://127.0.0.1:${loadConfig().port}`));
