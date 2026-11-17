import {read,utils} from 'xlsx';
import {createHash} from 'node:crypto';
import {EPA_SOURCE,type EmissionFactor} from '../src/factors';
export function parseEPAFactors(csv:string):EmissionFactor[]{
 if(csv.length>5_000_000||/<html/i.test(csv))throw new Error('배출계수 원본 형식 오류');
 const book=read(csv,{type:'string',raw:true});const table=utils.sheet_to_json<string[]>(book.Sheets[book.SheetNames[0]],{header:1,raw:false,defval:''});
 const headers=table[0]?.map(s=>s.trim())??[];
 const at=(name:string)=>{const index=headers.indexOf(name);if(index<0)throw new Error(`배출계수 원본 컬럼 누락: ${name}`);return index;};
 const code=at('2017 NAICS Code'),title=at('2017 NAICS Title'),value=at('Supply Chain Emission Factors without Margins'),margins=at('Supply Chain Emission Factors with Margins'),unit=at('Unit');
 const ids=new Set<string>();
 const factors=table.slice(1).filter(row=>row.some(Boolean)).map(row=>{
  const id=String(row[code]).trim(),v=Number(row[value]),withMargins=Number(row[margins]);
  if(!/^\d{6}$/.test(id)||ids.has(id)||!row[title]?.trim()||!row[value]?.trim()||!row[margins]?.trim()||!Number.isFinite(v)||v<0||!Number.isFinite(withMargins)||withMargins<0||! /co2e/i.test(row[unit]))throw new Error('배출계수 값·단위·식별자 검증 실패');ids.add(id);
  return {id:`${EPA_SOURCE.id}:${id}:SEF`,code:id,title:row[title],value:v,withMargins,source:EPA_SOURCE.id,unit:EPA_SOURCE.unit,year:2022 as const,region:'US' as const,boundary:'cradle-to-production' as const};
 });if(!factors.length)throw new Error('배출계수 데이터가 비어 있습니다.');return factors;
}
export function createFactorProvider(request:typeof fetch=fetch){
 let pending:Promise<{source:typeof EPA_SOURCE;factors:EmissionFactor[];retrievedAt:string;sha256:string}>|undefined;
 return ()=>pending??=(async()=>{try{
  const response=await request(EPA_SOURCE.download,{signal:AbortSignal.timeout(20000)});if(!response.ok)throw new Error('공식 배출계수 원본 응답 오류');
  if(Number(response.headers.get('content-length'))>5_000_000)throw new Error('배출계수 파일 크기 초과');
  const reader=response.body?.getReader();if(!reader)throw new Error('배출계수 원본을 읽지 못했습니다.');let bytes=0;const chunks:Uint8Array[]=[];
  while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.length;if(bytes>5_000_000){await reader.cancel();throw new Error('배출계수 파일 크기 초과');}chunks.push(value);}
  const csv=Buffer.concat(chunks).toString('utf8');const factors=parseEPAFactors(csv);if(factors.length!==1016)throw new Error('고정 버전의 계수 개수가 달라 검토가 필요합니다.');
  return {source:EPA_SOURCE,factors,retrievedAt:new Date().toISOString(),sha256:createHash('sha256').update(csv).digest('hex')};
 }catch(error){pending=undefined;throw error;}})();
}
