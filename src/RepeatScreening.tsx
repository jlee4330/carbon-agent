import {useEffect,useMemo,useState} from 'react';
import type {Column,Mapping} from './shared';
import {repeatComparison} from './repeatComparison';
const relevant=['order_id','id','line_id','receipt_id','code','item','supplier','receipt_date','date','receipt_quantity','quantity','unit','receipt_unit','amount','currency'];
export function RepeatScreening({columns,rows,mappings,indices}:{columns:Column[];rows:string[][];mappings:Mapping[];indices:number[]}){
 const comparisons=useMemo(()=>repeatComparison(columns,rows,mappings,indices),[columns,rows,mappings,indices]);
 const [selectedId,setSelectedId]=useState(''),[page,setPage]=useState(0);const selected=comparisons.find(group=>group.id===selectedId)??comparisons[0];
 const selectedRows=selected?.indices??indices;
 const sample=useMemo(()=>{const ids=new Set(mappings.filter(m=>relevant.includes(m.field)&&m.column).map(m=>m.column));const selected=columns.map((column,index)=>({column,index})).filter(v=>ids.has(v.column.id)).slice(0,29);if(!selected.length)selected.push(...columns.slice(0,29).map((column,index)=>({column,index})));
 return {columns:[{id:'__row',name:'원본 행'},...selected.map(v=>v.column)],rows:selectedRows.slice(0,12).map(i=>[String(i+1),...selected.map(v=>(rows[i][v.index]??'').slice(0,300))])};},[columns,rows,mappings,selectedRows]);
 const [result,setResult]=useState(''),[error,setError]=useState('');
 useEffect(()=>{const controller=new AbortController();let alive=true;setResult('');setError('');fetch('/api/review-repeats',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({columns:sample.columns.map(c=>c.name.slice(0,200)),rows:sample.rows}),signal:controller.signal}).then(async response=>{const data=await response.json();if(!response.ok)throw new Error(data.error||'검토 실패');if(alive)setResult(data.summary);}).catch(error=>{if(alive)setError(error.message);});return()=>{alive=false;controller.abort();};},[sample]);
 const visibleColumns=columns.map((column,index)=>({column,index})).filter(({column,index})=>sample.columns.some(c=>c.id===column.id)||selected?.changed.has(index));
 const pageCount=Math.max(1,Math.ceil(selectedRows.length/20));const safePage=Math.min(page,pageCount-1);
 return <div className="repeat-screening">
 <div className="repeat-toolbar"><label>비교할 기록<select value={selected?.id??''} onChange={e=>{setSelectedId(e.target.value);setPage(0);}}>{comparisons.map((group,index)=><option key={group.id} value={group.id}>{index+1}. {group.label} · {group.indices.length}건</option>)}</select></label><div className="repeat-legend"><span className="repeat-key">같은 구매번호</span><span className="repeat-different">서로 다른 값</span><span className="repeat-exact">원본 전체 값 동일</span></div></div>
 <div className="repeat-compare-table" role="region" aria-label="반복 후보 비교" tabIndex={0}><table><thead><tr><th>원본 행</th>{visibleColumns.map(({column,index})=><th key={column.id}>{column.name}{selected?.changed.has(index)&&<small>값 다름</small>}</th>)}</tr></thead><tbody>{selectedRows.slice(safePage*20,safePage*20+20).map(i=><tr key={i}><th>{i+1}{selected?.identical.has(i)&&<small className="repeat-exact">동일 기록</small>}</th>{visibleColumns.map(({column,index})=><td key={column.id} className={index===selected?.keyIndex?'repeat-key':selected?.changed.has(index)?'repeat-different':''}>{rows[i]?.[index]||'—'}</td>)}</tr>)}</tbody></table></div>
 {pageCount>1&&<div className="group-pagination"><button disabled={!safePage} onClick={()=>setPage(safePage-1)}>이전 기록</button><span>{safePage+1} / {pageCount}</span><button disabled={safePage>=pageCount-1} onClick={()=>setPage(safePage+1)}>다음 기록</button></div>}
 <p className="subtle-note">강조는 기록의 일치·차이를 뜻하며, 중복 거래로 확정한 것은 아닙니다. 아래 답변은 반복 후보 전체에 적용됩니다.</p>
 <p>{error||result||'선택한 기록의 차이를 확인하고 있습니다…'}</p></div>;
}
