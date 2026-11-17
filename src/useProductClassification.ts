import {readApiJson} from './apiResponse';
import {useEffect,useMemo,useState} from 'react';
import {mergeProductInputs,productInput,needsProductMeaning,missingMeaning,type ProductInput,type ProductClassification} from './productClassification';
import type {Column,Mapping} from './shared';
import type {PurchaseGroup} from './grouping';
import type {EmissionFactor} from './factors';
export type SemanticReview={inputs:ProductInput[];results:Record<string,ProductClassification>;meanings:Record<string,string>;loading:boolean;error:string;onMeaning:(id:string,text:string)=>void;onMeanings:(ids:string[],text:string)=>void;onRetry:()=>void};
export function useProductClassification(enabled:boolean,scope:string,groups:PurchaseGroup[],columns:Column[],rows:string[][],maps:Mapping[],catalog:EmissionFactor[]):SemanticReview{
 const [storedMeanings,setMeanings]=useState<Record<string,string>>({}),[cache,setCache]=useState<Record<string,ProductClassification>>({}),[loading,setLoading]=useState(false),[error,setError]=useState(''),[retry,setRetry]=useState(0);
 const meanings=useMemo(()=>Object.fromEntries(groups.map(group=>{const p=productInput(group,columns,rows,maps,'');return [p.id,storedMeanings[scope+p.id]??''];})),[scope,groups,columns,rows,maps,storedMeanings]);
 const inputs=useMemo(()=>mergeProductInputs(groups.map(group=>{const product=productInput(group,columns,rows,maps,'');return {...product,userDescription:meanings[product.id]??''};})),[groups,columns,rows,maps,meanings]);
 const catalogKey=catalog.map(f=>f.id).join('|');
 const keyed=useMemo(()=>inputs.map(input=>({input,key:scope+JSON.stringify(input)+catalogKey})),[inputs,scope,catalogKey]);
 const results=useMemo(()=>Object.fromEntries(keyed.flatMap(({key,input})=>cache[key]?[[input.id,cache[key]]]:needsProductMeaning(input)?[[input.id,missingMeaning(input)]]:[])),[keyed,cache]);
 useEffect(()=>{if(!enabled)return;const controller=new AbortController();let alive=true;const missing=keyed.filter(({key,input})=>!cache[key]&&!needsProductMeaning(input));if(!missing.length){setLoading(false);setError('');return;}setLoading(true);setError('');
 (async()=>{try{for(let start=0;start<missing.length;start+=20){const batch=missing.slice(start,start+20);const response=await fetch('/api/classify-products',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({products:batch.map(entry=>entry.input),useCatalog:Boolean(catalog.length),catalogSource:catalog[0]?.source}),signal:controller.signal});const data=await readApiJson(response);if(!response.ok)throw new Error(data.error||'품목 의미 분류에 실패했습니다.');if(!alive)return;const additions:Record<string,ProductClassification>={};for(const entry of batch){const result=data.products?.find((r:ProductClassification)=>r.id===entry.input.id);if(!result)throw new Error('품목 분류 결과가 누락되었습니다.');additions[entry.key]=result;}setCache(old=>({...old,...additions}));}}catch(e){if(alive)setError(e instanceof Error?e.message:'품목 분류 오류');}finally{if(alive)setLoading(false);}})();
 return ()=>{alive=false;controller.abort();};
 // Cache updates must not restart or duplicate the running batch queue.
 },[enabled,keyed,retry]);
 return {inputs,results,meanings,loading,error,onMeaning:(id,text)=>setMeanings(old=>({...old,[scope+id]:text.trim()})),onMeanings:(ids,text)=>setMeanings(old=>({...old,...Object.fromEntries(ids.map(id=>[scope+id,text.trim()]))})),onRetry:()=>setRetry(old=>old+1)};
}
