import {cat1Template} from './cat1Template';
import { useMemo, useState, useEffect, useRef } from 'react';
import { utils } from 'xlsx';
import { DataTable } from './DataTable';
import { MappingGuide } from './MappingGuide';
import { fields, fieldGroups, type Column, type Mapping } from './shared';
import { mappedColumns } from './mapping';

export function MappingPreview({ columns, rows, mappings, sheet, filename, manual, onChange, onAdd, onRemove }: {
 columns: Column[]; rows: string[][]; mappings: Mapping[]; sheet: string; filename: string; manual: boolean;
 onChange: (field: string, column: string) => void; onAdd: (label: string, column: string) => void; onRemove: (field: string) => void;
}) {
 const [adding,setAdding]=useState(false),[name,setName]=useState(''),[source,setSource]=useState(''),[error,setError]=useState('');
 const [view,setView]=useState<'mapping'|'original'>('mapping');
 const [fieldGroup,setFieldGroup]=useState('template');
 const [activeField,setActiveField]=useState<string|null>(null);
 const workspace=useRef<HTMLElement>(null);
 function selectField(field:string){
  setView('mapping');setFieldGroup(fieldGroups.find(group=>group.ids.some(id=>id===field))?.id??'all');setActiveField(field);
  requestAnimationFrame(()=>{const target=workspace.current?.querySelector<HTMLElement>(`[data-mapping-field="${field}"]`);target?.scrollIntoView({block:'nearest',inline:'center'});target?.querySelector('select')?.focus({preventScroll:true});});
 }
 const originalColumns=useMemo(()=>columns.map((column,index)=>({...column,name:`${utils.encode_col(index)} · ${column.name}`})),[columns]);
 const outputColumns=useMemo(()=>mappedColumns(mappings),[mappings]);
 const visibleColumns=useMemo(()=>fieldGroup==='all'?outputColumns:fieldGroup==='template'?cat1Template.flatMap(group=>group.fields).flatMap(field=>outputColumns.filter(column=>column.id===field.id)):outputColumns.filter(column=>fieldGroups.find(group=>group.id===fieldGroup)?.ids.some(id=>id===column.id)),[outputColumns,fieldGroup]);
 const lastId=outputColumns.at(-1)?.id;
 useEffect(()=>{if(lastId?.startsWith('custom_'))workspace.current?.querySelector('.mapped-view th:last-child')?.scrollIntoView({block:'nearest',inline:'end'});},[lastId]);
 function add(){
  const label=name.trim();
  if(!label){setError('컬럼 이름을 입력해주세요.');return;}
  if(outputColumns.some(column=>column.name.toLocaleLowerCase()===label.toLocaleLowerCase())){setError('이미 사용 중인 컬럼 이름입니다. 다른 이름을 입력해주세요.');return;}
  setView('mapping');setFieldGroup('all');onAdd(label,source);setName('');setSource('');setError('');setAdding(false);
 }
 const projection = useMemo(() => visibleColumns.map(column=>columns.findIndex(source=>source.id===mappings.find(mapping=>mapping.field===column.id)?.column)), [columns, mappings,visibleColumns]);
 const pending = mappings.filter(mapping => mapping.status === 'review').length;
 return <><MappingGuide columns={columns} mappings={mappings} onSelect={selectField} active={activeField}/><section ref={workspace} className="mapping-workspace" aria-label="구매·입고 컬럼 연결 및 데이터">
  <div className="mapping-toolbar">
   <div className="mapping-source"><span className="pill">{manual ? '수동 연결' : 'AI 추천'}</span><strong title={filename}>{filename}</strong><span>{sheet} · {rows.length.toLocaleString()}행</span></div>
   <div className="mapping-counts">{pending > 0 && <span className="mapping-status review">확인 필요 {pending}</span>}<button type="button" className="secondary add-column-button" onClick={()=>{setView('mapping');setAdding(!adding);setError('');}}>+ 컬럼 추가</button></div>
  </div>
  <div className="data-view-bar"><div className="data-view-switch" role="group" aria-label="데이터 보기 선택"><button type="button" aria-pressed={view==='mapping'} onClick={()=>setView('mapping')}>컬럼 연결 <span>{outputColumns.length}</span></button><button type="button" aria-pressed={view==='original'} onClick={()=>setView('original')}>원본 전체 <span>{columns.length}</span></button></div><span>{view==='original'?'원본의 모든 열을 확인한 뒤 컬럼 연결로 돌아가 수정하세요.':'표 위에서 연결을 바꾸고 아래 데이터로 확인하세요.'}</span></div>
  <div className="mapped-view" hidden={view!=='mapping'}>
  {adding && <form className="add-column-form" onSubmit={event=>{event.preventDefault();add();}}>
   <label>추가할 컬럼 이름<input autoFocus maxLength={80} value={name} onChange={event=>{setName(event.target.value);setError('');}} placeholder="예: 사업장, 소재, 입고 창고"/></label>
   <label>연결할 원본 컬럼<select value={source} onChange={event=>{setSource(event.target.value);if(!name.trim())setName(columns.find(column=>column.id===event.target.value)?.name.slice(0,80)??'');}}><option value="">나중에 연결</option>{columns.map((column,index)=><option key={column.id} value={column.id}>{column.name} ({utils.encode_col(index)})</option>)}</select></label>
   <button type="submit" className="primary">추가</button><button type="button" className="text-button" onClick={()=>{setAdding(false);setError('');}}>취소</button>
   {error&&<p className="column-form-error" role="alert">{error}</p>}
  </form>}
  <div className="mapping-field-tabs" role="group" aria-label="연결 영역"><button aria-pressed={fieldGroup==='template'} onClick={()=>setFieldGroup('template')}>템플릿 항목</button><button aria-pressed={fieldGroup==='all'} onClick={()=>setFieldGroup('all')}>전체</button>{fieldGroups.filter(group=>group.id!=='support').map((group,index)=><button key={group.id} aria-pressed={fieldGroup===group.id} onClick={()=>setFieldGroup(group.id)}>{String.fromCharCode(65+index)}. {group.title.replace(/^[A-Z]\.\s*/,'')}</button>)}</div>
  <DataTable key={sheet+fieldGroup} columns={visibleColumns} rows={rows} columnIndices={projection} label="컬럼 연결을 수정할 수 있는 구매·입고 내역" headerHeight={150} columnWidth={230} showCaption={false} renderHeader={column => {
   const mapping = mappings.find(value => value.field === column.id);
   const status = mapping?.status ?? 'missing';
   return <div data-mapping-field={column.id} className={`mapping-column ${status} ${activeField===column.id?'is-highlighted':''}`}>
    <div className="mapping-column-title"><strong title={fields.find(([id]) => id === column.id)?.[2]}>{column.name}</strong><span className={`mapping-status ${status}`}>{status === 'review' ? '확인 필요' : status === 'missing' ? '미연결' : '연결됨'}</span></div>
    <label><span>원본 컬럼</span><select aria-label={`${column.name} 원본 컬럼`} value={mapping?.column ?? ''} onChange={event => onChange(column.id, event.target.value)}><option value="">해당 컬럼 없음</option>{columns.map((source, index) => <option key={source.id} value={source.id}>{source.name} ({utils.encode_col(index)})</option>)}</select></label>
    {column.id.startsWith('custom_')&&<button type="button" className="remove-column-button" aria-label={`${column.name} 컬럼 삭제`} onClick={()=>onRemove(column.id)}>추가 컬럼 삭제</button>}
   </div>;
  }}/>
  </div>
  <div hidden={view!=='original'}><DataTable key={`original:${sheet}`} columns={originalColumns} rows={rows} label="선택한 시트의 원본 전체 데이터" columnWidth={230} showCaption={false}/></div>
  <div className="mapping-table-hint">가로·세로로 스크롤하여 전체 내역을 확인하세요. 보기를 전환해도 수정한 연결은 유지됩니다. ‘—’는 미연결 또는 원본 빈 값입니다.</div>
 </section></>;
}
