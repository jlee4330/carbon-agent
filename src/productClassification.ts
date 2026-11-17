import type {Column,Mapping} from './shared';
import type {PurchaseGroup} from './grouping';
export type ProductInput={id:string;code:string;name:string;supplier:string;category:string;details:string[];userDescription:string};
export type ProductClassification={id:string;status:'classified'|'needs_input'|'no_match';productName:string;material:string;use:string;factorIds:string[];reason:string;question:string;};
export function productKey(group:PurchaseGroup){return JSON.stringify([group.code.trim(),group.item.trim(),group.supplier.trim(),group.category.trim()]);}
export function productInput(group:PurchaseGroup,columns:Column[],rows:string[][],mappings:Mapping[],description:string):ProductInput{
 const fields=['description','specification','manufacturer','material_composition','eeio_category','manufacturing_country'];const indices=fields.map(field=>columns.findIndex(c=>c.id===mappings.find(m=>m.field===field)?.column));
 const details=[...new Set(group.rowIndices.flatMap(index=>indices.map(column=>rows[index]?.[column]?.trim()??'')).filter(Boolean))].slice(0,8).map(value=>value.slice(0,300));
 return {id:productKey(group),code:group.code.slice(0,200),name:group.item.slice(0,300),supplier:group.supplier.slice(0,300),category:group.category.slice(0,200),details,userDescription:description.slice(0,2000)};
}
export function mergeProductInputs(products:ProductInput[]):ProductInput[]{
 const result=new Map<string,ProductInput>();for(const product of products){const old=result.get(product.id);result.set(product.id,old?{...old,details:[...new Set([...old.details,...product.details])].slice(0,12)}:product);}return [...result.values()];
}
export function needsProductMeaning(product:ProductInput){const name=product.name.trim();return !product.userDescription.trim()&&!product.details.length&&(!name||name===product.code||/^[A-Z][A-Z0-9_-]*\d[A-Z0-9_-]*$/i.test(name));}
export function missingMeaning(product:ProductInput):ProductClassification{return {id:product.id,status:'needs_input',productName:'',material:'',use:'',factorIds:[],reason:'내부 코드만으로 제품의 의미를 알 수 없습니다.',question:`${product.code||product.name||'이 품목'}은 어떤 제품·서비스인가요? 알고 있는 제품명, 소재 또는 용도를 알려주세요.`};}
