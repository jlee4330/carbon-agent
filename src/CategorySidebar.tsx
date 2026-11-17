import { ArrowRight, Check, GitBranch } from 'lucide-react';
export function CategorySidebar({names,candidates,completed,onStart}:{names:string[];candidates:number[];completed:boolean;onStart:()=>void}){
 return <aside className="history-panel category-sidebar" aria-label="Scope 3 카테고리">
  <div className="category-sidebar-title"><span>SCOPE 3</span><h2>산정 카테고리</h2></div>
  <div className="screening-nav-current" aria-current="page"><GitBranch size={16}/><span>산정 범위 확인</span>{completed&&<Check size={14}/>}</div>
  <nav aria-label="카테고리 선택"><div className="sidebar-section-label">구매와 운영</div>{names.map((name,index)=><div key={name}>{index===8&&<div className="sidebar-section-label downstream-label">판매 이후</div>}<button className={`category-nav-item ${index===0?'available':''} ${candidates.includes(index+1)?'candidate':''}`} disabled={index!==0} onClick={onStart} title={index===0?'Cat 1 자료 검토 시작':'산정 기능 준비 중'}><span className="category-nav-number">{String(index+1).padStart(2,'0')}</span><span>{name}</span>{candidates.includes(index+1)?<span className="category-candidate-dot" aria-label="검토 후보"/>:index===0?<ArrowRight size={12}/>:null}</button></div>)}</nav>
 </aside>;
}
