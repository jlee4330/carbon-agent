import {useState} from 'react';
import type {ProductClassification} from './productClassification';
export function ProductMeaning({id,meaning,result,count,onSave}:{id:string;meaning:string;result?:ProductClassification;count:number;onSave:(id:string,text:string)=>void}){
 const [text,setText]=useState(meaning);
 return <section className="method-recommendation"><span>제품 의미 확인 · 동일 코드·품명·공급처 {count}개 묶음에 재사용</span><h3>{result?.question||'이 품목의 실제 제품명·소재·용도를 알려주세요'}</h3><p>알고 있는 내용만 입력하세요. 원본은 유지하고 사용자 설명을 분류 근거로 추가합니다.</p><label className="context-note-label">제품 설명<textarea maxLength={2000} rows={3} value={text} onChange={e=>setText(e.target.value)} placeholder="예: 설비 세척용 수산화나트륨 수용액. 농도는 확인 필요"/></label><button className="secondary" disabled={!text.trim()||text.trim()===meaning} onClick={()=>onSave(id,text)}>설명 반영하고 다시 분류</button>{meaning&&<button className="text-button" onClick={()=>{setText('');onSave(id,'');}}>설명 삭제</button>}<p>다른 규격이 섞인 코드라면 함께 알려주세요. 모르는 내용은 추정해 입력하지 않아도 됩니다.</p></section>;
}
