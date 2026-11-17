export type Step='categories'|'intro'|'question'|'none'|'unsure'|'upload'|'analyzing'|'mapping'|'context'|'done'|'methods'|'methodSummary';
export const stepLabels:Record<Exclude<Step,'categories'>,string>={intro:'시작 안내',question:'구매 자료 보유 여부',none:'구매 자료 미확보',unsure:'구매·회계 담당자 확인',upload:'구매내역 업로드',analyzing:'Agent 자료 검토',mapping:'컬럼 연결 확인',context:'산정 조건 확인',done:'추가 정보 확인',methods:'자동 산정 검토',methodSummary:'배출량·미산정 내역'};
export function advanceHistory(history:Step[],next:Step):Step[]{
 if(next==='categories')return history;
 const index=history.indexOf(next);
 return index>=0?history.slice(0,index+1):[...history,next];
}
export function invalidateReview(history:Step[]):Step[]{return history.filter(s=>!['analyzing','mapping','context','done','methods','methodSummary'].includes(s));}
