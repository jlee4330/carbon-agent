export type TemplateField={id:string;label:string;requirement:string;rule:string;purpose:string};
// Source: Agent 1 template draft 260904, 템플릿 구성!B52:L73.
export const cat1Template:{title:string;fields:TemplateField[]}[]=[
  {
    "title": "A. 식별 정보",
    "fields": [
      {
        "id": "purchase_data_id",
        "label": "구매 데이터 ID",
        "requirement": "(자동)",
        "rule": "Cat 1 & 2 내 row 식별을 위한 고유 번호",
        "purpose": ""
      }
    ]
  },
  {
    "title": "B. 조직 정보",
    "fields": [
      {
        "id": "account_company",
        "label": "회사명",
        "requirement": "(자동)",
        "rule": "탄소배출량 산정을 진행하는 회사명 (그린플로 계정 내 입력된 회사명 사용)",
        "purpose": ""
      },
      {
        "id": "site",
        "label": "사업장명",
        "requirement": "선택",
        "rule": "회사를 상위 depth로 하는 하위 depth 조직인 사업장 명의 입력",
        "purpose": ""
      }
    ]
  },
  {
    "title": "C. 구매정보",
    "fields": [
      {
        "id": "receipt_date",
        "label": "입고일자",
        "requirement": "필수",
        "rule": "구매한 물품·서비스의 물품의 입고 일자",
        "purpose": "해당 구매로 인해 발생한 탄소배출량의 귀속 연도 판단에 사용"
      },
      {
        "id": "item",
        "label": "구매품목명",
        "requirement": "필수",
        "rule": "구매한 물품의 품목 명",
        "purpose": "해당 구매로 인해 발생한 탄소배출량의 귀속 연도 판단 및 배출원 등록 시 명칭 부여에 사용"
      },
      {
        "id": "purchase_type",
        "label": "구매 유형",
        "requirement": "필수",
        "rule": "구매한 물품의 유형이 일반 구매 / 자본재 중 어디에 속하는지 선택",
        "purpose": "해당 구매로 인해 발생한 탄소배출량이 Cat.1과 Cat.2 중 어디에 귀속되는지 판단하는데 사용"
      },
      {
        "id": "major_category",
        "label": "대분류",
        "requirement": "필수",
        "rule": "구매 물품의 유형이 원료 물질 / 부자재 / 포장재 / 상품 / 서비스 / 기타 중 어디에 속하는지 선택",
        "purpose": "배출계수 매핑을 위한 기반 데이터로 사용"
      },
      {
        "id": "eeio_category",
        "label": "중분류",
        "requirement": "조건부 필수",
        "rule": "구매 물품의 유형이 US EEIO 기준 어떤 유형에 속하는지 선택",
        "purpose": "배출계수 매핑을 위한 기반 데이터로 사용 / 비용 기반 산정이 적용되어야 하는 구매 품목의 경우 US EEIO 계수 매핑 기준으로 사용"
      },
      {
        "id": "material_composition",
        "label": "원재료 성분",
        "requirement": "조건부 필수",
        "rule": "구매 물품의 원재료 성분 및 성분 별 비중",
        "purpose": "배출계수 매핑을 위한 기반 데이터로 사용 / 비용 기반 산정 외 방법론이 적용 가능한 구매 품목의 경우 계수 매핑 기준으로 사용"
      },
      {
        "id": "manufacturer",
        "label": "제조사명",
        "requirement": "선택",
        "rule": "구매 물품의 제조사 명칭",
        "purpose": "배출계수 매핑을 위한 기반 데이터로 사용"
      },
      {
        "id": "manufacturer_address",
        "label": "제조사 주소",
        "requirement": "선택",
        "rule": "구매 물품의 제조사 주소",
        "purpose": "배출계수 매핑을 위한 기반 데이터로 사용"
      },
      {
        "id": "supplier",
        "label": "공급처명",
        "requirement": "선택",
        "rule": "구매 물품의 공급처 명칭",
        "purpose": ""
      },
      {
        "id": "manufacturing_country",
        "label": "제조국가",
        "requirement": "선택",
        "rule": "구매 물품이 제조된 제조국 명칭",
        "purpose": "배출계수 매핑을 위한 기반 데이터로 사용"
      }
    ]
  },
  {
    "title": "D. 활동량",
    "fields": [
      {
        "id": "receipt_quantity",
        "label": "입고수량",
        "requirement": "선택",
        "rule": "구매 물품의 입고 시 수량 (단, 수량 단위가 중량이 아닌 경우 중량을 환산한 후 입고 중량 column에 값 입력)",
        "purpose": "입고 중량으로의 환산을 위한 데이터로 사용"
      },
      {
        "id": "receipt_unit",
        "label": "수량단위",
        "requirement": "선택",
        "rule": "구매 물품의 입고수량의 산정 단위  (단, 수량 단위가 중량이 아닌 경우 중량을 환산한 후 입고 중량 column에 값 입력)",
        "purpose": "입고 중량으로의 환산을 위한 데이터로 사용"
      },
      {
        "id": "receipt_weight",
        "label": "입고중량",
        "requirement": "조건부 필수",
        "rule": "구매 물품의 입고 시 총 중량",
        "purpose": "배출량 산정을 활동 데이터로 사용 / 비용 기반 산정 외 방법론이 적용되는 구매 품목의 활동 데이터로 사용"
      },
      {
        "id": "weight_unit",
        "label": "중량단위",
        "requirement": "조건부 필수",
        "rule": "구매 물품의 입고수량의 중량 산정 단위",
        "purpose": "배출량 산정을 활동 데이터로 사용 / 비용 기반 산정 외 방법론이 적용되는 구매 품목의 활동 데이터로 사용"
      }
    ]
  },
  {
    "title": "E. 구매금액",
    "fields": [
      {
        "id": "amount",
        "label": "구매금액",
        "requirement": "조건부 필수",
        "rule": "구매 물품의 총 구매 금액",
        "purpose": "배출량 산정을 활동 데이터로 사용 / 비용 기반 산정이 적용되는 구매 품목의 활동 데이터로 사용"
      },
      {
        "id": "amount_krw",
        "label": "원화 기준 구매금액",
        "requirement": "조건부 필수",
        "rule": "비용 기반 산정을 위한 원화 기준 구매금액. 원화 거래는 구매금액을 사용할 수 있으며, 외화 거래는 확인된 원화 환산금액이 필요합니다.",
        "purpose": "초안의 템플릿 이슈 사항(B46)에 명시된 비용 기반 입력 항목"
      },
      {
        "id": "currency",
        "label": "통화단위",
        "requirement": "조건부 필수",
        "rule": "구매 물품의 구매 금액 단위",
        "purpose": "배출량 산정을 활동 데이터로 사용 / 비용 기반 산정이 적용되는 구매 품목의 활동 데이터로 사용"
      },
      {
        "id": "vat_included",
        "label": "VAT 포함 여부",
        "requirement": "조건부 필수",
        "rule": "구매 물품의 VAT 포함 여부",
        "purpose": "배출량 산정을 활동 데이터로 사용 / 비용 기반 산정이 적용되는 구매 품목의 활동 데이터로 사용"
      }
    ]
  },
  {
    "title": "F. 기타",
    "fields": [
      {
        "id": "preprocessing_confidence",
        "label": "전처리 신뢰도",
        "requirement": "(자동)",
        "rule": "AI Agent의 전처리 결과의 신뢰도",
        "purpose": "사용자의 템플릿 항목 검수 시 완성도 파악을 위한 기준으로 사용"
      },
      {
        "id": "remarks",
        "label": "비고",
        "requirement": "(자동)",
        "rule": "AI Agent의 전처리 결과 이슈 사항 표시",
        "purpose": "사용자의 템플릿 항목 검수 시 완성도 파악을 위한 기준으로 사용"
      }
    ]
  }
];
