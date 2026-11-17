import type {ProductInput} from './productClassification';
export type IdentityGroup={label:string;ids:string[];needsDetails:boolean};
export function splitIdentityScreening(products:ProductInput[]){
 const immediate=new Map<string,IdentityGroup>(),remaining:ProductInput[]=[];
 for(const product of products){const name=product.name.trim();
  // Code syntax is observable; its actual product meaning is never inferred.
  const coded=/^[A-Z][A-Z0-9_-]*\d[A-Z0-9_-]*$/i.test(name)||Boolean(name&&name===product.code.trim());
  if(product.details.length||product.userDescription.trim()||(!coded&&name)){remaining.push(product);continue;}
  const prefix=name.match(/^([A-Za-z]+)[-_]?\d/);const label=!name?'품목명 누락':prefix?`${prefix[1].toUpperCase()} 코드`:'코드로 표시된 품목';
  const group=immediate.get(label)??{label,ids:[],needsDetails:true};group.ids.push(product.id);immediate.set(label,group);
 }
 return {immediate:[...immediate.values()],remaining};
}
