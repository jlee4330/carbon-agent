import type {Column,Mapping} from './shared';
export function repeatComparison(columns:Column[],rows:string[][],mappings:Mapping[],indices:number[]){
 const key=mappings.find(m=>m.field==='order_id'&&m.column)??mappings.find(m=>m.field==='id'&&m.column);
 const keyIndex=columns.findIndex(c=>c.id===key?.column);
 const buckets=new Map<string,number[]>();
 for(const index of indices){const value=rows[index]?.[keyIndex]?.trim();const id=value?`id:${value}`:`row:${JSON.stringify(rows[index])}`;const bucket=buckets.get(id)??[];bucket.push(index);buckets.set(id,bucket);}
 return [...buckets.entries()].filter(([,list])=>list.length>1).map(([id,list])=>{
  const fingerprints=new Map<string,number[]>();for(const index of list){const fingerprint=JSON.stringify(rows[index]);const items=fingerprints.get(fingerprint)??[];items.push(index);fingerprints.set(fingerprint,items);}
  const identical=new Set([...fingerprints.values()].filter(items=>items.length>1).flat());
  const changed=new Set(columns.flatMap((_,column)=>new Set(list.map(i=>rows[i]?.[column]??'')).size>1?[column]:[]));
  return {id,label:id.startsWith('id:')?id.slice(3):'동일 원본 기록',indices:list,identical,changed,keyIndex};
 });
}
