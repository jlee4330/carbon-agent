import {cat1Template} from './cat1Template';
export const fields = [
 ['date','거래일','구매 거래일. 주문일·입고일·청구일과 구분'],['item','구매품목명','구매한 제품이나 서비스'],['code','품목코드','내부 품목 식별 코드'],['supplier','공급처명','거래처 또는 공급사'],['amount','구매금액','구매 내역의 금액'],['currency','통화단위','KRW, USD 등'],['quantity','구매수량','원본에서 구매수량으로 명시된 값. 주문·입고·청구 수량을 대신 선택하지 않음'],['unit','구매수량 단위','구매수량에 대응하는 명시적 단위'],['category','분류·계정과목','품목 분류 또는 회계 계정'],['id','거래 식별자','전표번호 또는 거래번호'],
 ['company','구매 법인','구매한 회사 또는 법인'],['site','사업장명','구매 내역이 속한 사업장'],
 ['order_date','주문일','발주 또는 주문이 발생한 날짜'],['receipt_date','입고일자','실제 입고 또는 GR 전기 날짜'],['invoice_date','청구일','청구서 또는 송장 날짜'],
 ['order_id','발주번호','구매 주문 또는 발주 문서 번호'],['receipt_id','입고 문서번호','입고 또는 자재 문서 번호'],['invoice_id','청구번호','청구서 또는 송장 번호'],['line_id','거래 상세행 번호','문서 안에서 개별 거래 행을 구분하는 번호'],
 ['description','거래 설명','품목명 외의 구매 목적 또는 거래 상세 설명'],['specification','규격·사양','재질·치수·모델 등 제품 규격'],['manufacturer','제조사명','공급업체와 구분되는 실제 제조사'],
 ['order_quantity','주문수량','발주 또는 주문한 양'],['order_unit','주문수량 단위','주문수량에 대응하는 단위'],
 ['receipt_quantity','입고수량','실제 입고된 양. 주문 또는 청구 수량과 구분'],['receipt_unit','수량단위','입고수량에 대응하는 명시적 단위'],
 ['invoice_quantity','청구수량','청구서 또는 송장에 기재된 양'],['invoice_unit','청구수량 단위','청구수량에 대응하는 단위'],
 ['return_quantity','반품수량','반품한 양. 임의로 음수 변환하지 않음'],['return_unit','반품수량 단위','반품수량에 대응하는 단위'],['cancellation','반품·취소 구분','반품·취소·정정 여부 또는 거래 유형'],
 ['purchase_type','구매 유형','일반 구매 / 자본재. Cat 1과 Cat 2 구분. 원본에 있는 분류 컬럼만 연결'],
 ['major_category','대분류','원료 물질 / 부자재 / 포장재 / 상품 / 서비스 / 기타'],
 ['eeio_category','중분류','US EEIO 기준의 산업·품목 분류. 일반 계정과목이나 내부 분류를 US EEIO 분류로 단정하지 않음'],
 ['material_composition','원재료 성분','원재료 성분과 성분별 비중. 품목명에서 추정하거나 생성하지 않음'],
 ['manufacturer_address','제조사 주소','실제 제조사 소재지. 공급처 주소와 구분'],
 ['manufacturing_country','제조국가','구매 물품의 제조국. 통화나 공급처 위치로 추정하지 않음'],
 ['receipt_weight','입고중량','입고된 물품의 총 중량. EA 수량·개당 중량·순중량과 구분. 이 단계에서 환산하지 않음'],
 ['weight_unit','중량단위','입고중량에 대응하는 명시적 중량 단위'],
 ['amount_krw','원화 기준 구매금액','원본에 명시된 KRW 환산 총 구매금액. 환율을 추정하지 않음. VAT 포함 여부와 별도 세금에 따라 순액 확인'],
 ['vat_included','VAT 포함 여부','구매금액에 VAT가 포함되는지 나타내는 명시적 컬럼. 세금 금액과 구분'],
 ['discount','할인금액','별도 표시된 할인액'],['refund','환불금액','별도 표시된 환불액'],['tax','세금','별도 표시된 부가세 등 세금'],['additional_cost','부대비용','별도 표시된 운송료 등 부대비용. 구매금액에 임의 합산하지 않음']
] as const;
export const templateRequirements:Record<string,'필수'|'중량 기반'|'비용 기반'|'선택'>={
 site:'선택',receipt_date:'필수',item:'필수',purchase_type:'필수',major_category:'필수',eeio_category:'비용 기반',material_composition:'중량 기반',manufacturer:'선택',manufacturer_address:'선택',supplier:'선택',manufacturing_country:'선택',receipt_quantity:'선택',receipt_unit:'선택',receipt_weight:'중량 기반',weight_unit:'중량 기반',amount:'비용 기반',amount_krw:'비용 기반',currency:'비용 기반',vat_included:'비용 기반'
};
export const automaticTemplateFields=[{id:'purchase_data_id',label:'구매 데이터 ID',source:'원본 행별 고유 ID 생성'},{id:'account_company',label:'회사명',source:'계정 정보 사용 · 현재 계정 연동 전'},{id:'preprocessing_confidence',label:'전처리 신뢰도',source:'전처리 결과에서 생성'},{id:'remarks',label:'비고',source:'누락·확인 사항에서 생성'}] as const;
export const fieldGroups = [
 ...cat1Template.map((group,index)=>({id:['trace','scope','product','quantity','amount','other'][index],title:group.title,description:'',ids:group.fields.filter(field=>field.requirement!=='(자동)').map(field=>field.id)})).filter(group=>group.ids.length),
 {id:'support',title:'추가 ERP 정보',description:'품목 식별·원본 추적·차이 확인용',ids:fields.filter(([id])=>!(id in templateRequirements)).map(([id])=>id)},
];
export type Mapping = {field:string; label?:string; column:string|null; status:'recommended'|'review'|'missing'; reason:string};
export type Column = {id:string; name:string};
