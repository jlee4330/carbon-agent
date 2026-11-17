export type ScreeningId='1.1'|'1.2'|'1.3'|'1.4'|'1.5'|'1.6'|'2.1'|'2.2'|'3.1'|'3.2'|'4.1'|'4.2'|'5.1'|'5.2'|'5.3';
type Branch={next:ScreeningId|null;categories?:number[];scope12?:boolean;note?:string;excludeCat1?:boolean};
type Question={group:string;text:string;hint:string;yes:Branch;no:Branch};
export const screeningQuestions:Record<ScreeningId,Question>={
 '1.1':{group:'구매 · 물류',text:'구매 계약과 운송 계약을 분리해서 관리하나요?',hint:'제품 구매와 운송을 별도 계약으로 관리하는지 확인해주세요.',yes:{next:'1.2',categories:[1,4],note:'구매와 운송을 Cat 1과 Cat 4로 분리하여 검토합니다.'},no:{next:'1.2',categories:[1],note:'제공된 순서도에 따라 구매는 Cat 1로 검토합니다.'}},
 '1.2':{group:'구매 · 물류',text:'운송 중 보관창고를 거치나요?',hint:'출발지에서 도착지까지 이동하는 사이에 보관하는 창고가 있는지 확인해주세요.',yes:{next:'1.3',note:'출발지·경유지·도착지를 모두 확인하세요.'},no:{next:'1.5',note:'출발지·도착지를 확인하세요.'}},
 '1.3':{group:'구매 · 물류',text:'보관창고를 임차해서 사용하나요?',hint:'창고를 빌려 사용하는지, 보관 서비스를 위탁하는지 구분합니다.',yes:{next:'1.4'},no:{next:'1.5',categories:[4],note:'위탁 보관은 Cat 4 검토 대상입니다.'}},
 '1.4':{group:'구매 · 물류',text:'임차한 보관창고를 운영통제하나요?',hint:'창고 운영 방침을 정하고 실행할 권한이 있는지 확인해주세요.',yes:{next:'1.5',scope12:true,note:'운영통제하는 창고는 Scope 1·2로 검토합니다.'},no:{next:'1.5',categories:[8],note:'운영통제하지 않는 임차 창고는 Cat 8로 검토합니다.'}},
 '1.5':{group:'구매 · 물류',text:'제3자 무역을 하나요?',hint:'제품이 우리 사업장을 거치지 않고 제3자 사이에서 거래되는 무역이 있는지 확인해주세요.',yes:{next:'1.6'},no:{next:'2.1'}},
 '1.6':{group:'구매 · 물류',text:'거래 제품의 소유권이 우리 회사로 이전되나요?',hint:'제품이 직접 입고되는지와 별개로, 계약상 소유권 이전 여부를 확인해주세요.',yes:{next:'2.1',categories:[1],note:'소유권이 이전되는 거래는 Cat 1로 검토합니다.'},no:{next:'2.1',excludeCat1:true,note:'해당 제3자 무역 거래는 Cat 1에서 제외하고 물류만 검토합니다.'}},
 '2.1':{group:'판매 제품',text:'우리 회사가 판매하는 제품은 중간재인가요?',hint:'고객이 추가 가공하여 다른 제품을 만드는 데 사용하는 제품인지 확인해주세요.',yes:{next:'3.1',categories:[10],note:'중간재의 후속 가공은 Cat 10으로 검토합니다.'},no:{next:'2.2'}},
 '2.2':{group:'판매 제품',text:'판매 제품이 사용 중 에너지를 소비하나요?',hint:'고객이 제품을 사용할 때 전기나 연료 등을 사용하는지 확인해주세요.',yes:{next:'3.1',categories:[11],note:'제공된 순서도에서 Cat 11 필수 대상으로 분류됩니다.'},no:{next:'3.1',categories:[11],note:'Cat 11 적용 여부를 업종별로 검토해야 합니다.'}},
 '3.1':{group:'임대 자산',text:'우리 회사의 자산을 다른 회사에 임대해 주었나요?',hint:'우리가 자산을 빌려주는 임대인인 경우입니다.',yes:{next:'3.2'},no:{next:'4.1'}},
 '3.2':{group:'임대 자산',text:'임대해 준 자산을 우리 회사가 운영통제하나요?',hint:'임대 자산의 운영 방침을 정하고 실행할 권한이 있는지 확인해주세요.',yes:{next:'4.1',scope12:true,note:'운영통제하는 임대 자산은 Scope 1·2로 검토합니다.'},no:{next:'4.1',categories:[13],note:'운영통제하지 않는 임대 자산은 Cat 13으로 검토합니다.'}},
 '4.1':{group:'임차 자산',text:'다른 회사의 자산을 임차해서 사용하나요?',hint:'우리가 자산을 빌려 쓰는 임차인인 경우입니다.',yes:{next:'4.2'},no:{next:'5.1'}},
 '4.2':{group:'임차 자산',text:'임차한 자산을 우리 회사가 운영통제하나요?',hint:'빌려 쓰는 자산의 운영 방침을 정하고 실행할 권한이 있는지 확인해주세요.',yes:{next:'5.1',scope12:true,note:'운영통제하는 임차 자산은 Scope 1·2로 검토합니다.'},no:{next:'5.1',categories:[8],note:'운영통제하지 않는 임차 자산은 Cat 8로 검토합니다.'}},
 '5.1':{group:'판매 후 물류',text:'판매 제품을 고객에게 운송하나요?',hint:'판매 이후 고객까지 운송하는 활동이 있는지 확인해주세요.',yes:{next:'5.2'},no:{next:null}},
 '5.2':{group:'판매 후 물류',text:'운송 구간별로 운송비 부담 주체가 나뉘나요?',hint:'우리 회사 부담 구간과 고객 부담 구간이 나뉘는지 확인해주세요.',yes:{next:null,categories:[4,9],note:'구간별로 분리하여 우리 부담은 Cat 4, 고객 부담은 Cat 9로 검토합니다.'},no:{next:'5.3'}},
 '5.3':{group:'판매 후 물류',text:'운송비를 우리 회사가 지불하나요?',hint:'운송비를 최종적으로 부담하는 주체를 확인해주세요.',yes:{next:null,categories:[4],note:'우리 회사가 부담하는 운송은 Cat 4로 검토합니다.'},no:{next:null,categories:[9],note:'고객이 부담하는 운송은 Cat 9로 검토합니다.'}},
};
export function screeningSession(answers:boolean[]){
 let current:ScreeningId|null='1.1';
 const entries:{id:ScreeningId;answer:boolean;branch:Branch}[]=[];
 const categories=new Set<number>();let scope12=false;
 for(const answer of answers){
  if(!current)break;
  const branch:Branch=screeningQuestions[current][answer?'yes':'no'];
  entries.push({id:current,answer,branch});
  branch.categories?.forEach(category=>categories.add(category));
  if(branch.excludeCat1)categories.delete(1);
  if(branch.scope12)scope12=true;
  current=branch.next;
 }
 return {current,entries,categories:[...categories].sort((a,b)=>a-b),scope12};
}
