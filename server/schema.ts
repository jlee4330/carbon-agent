import {fields,type Mapping,type Column} from '../src/shared.ts';
export const inputSchema={safeParse(value:unknown):{success:true;data:{columns:Column[];rows:string[][]}}|{success:false}{
 const v=value as {columns:Column[];rows:string[][]};
 if(!v||!Array.isArray(v.columns)||!Array.isArray(v.rows)||!v.columns.length||v.columns.length>200||!v.rows.length||v.rows.length>100000)return {success:false};
 if(v.columns.some(c=>!c||typeof c.id!=='string'||c.id.length>20||typeof c.name!=='string'||c.name.length>10000)||new Set(v.columns.map(c=>c.id)).size!==v.columns.length)return {success:false};
 if(v.rows.some(r=>!Array.isArray(r)||r.length!==v.columns.length||r.some(c=>typeof c!=='string'||c.length>100000)))return {success:false};
 return {success:true,data:{columns:v.columns.map(c=>({id:c.id,name:c.name})),rows:v.rows}};
}};
export const resultJsonSchema={type:'object',properties:{mappings:{type:'array',items:{type:'object',properties:{field:{type:'string',enum:fields.map(f=>f[0])},column:{type:['string','null']},status:{type:'string',enum:['recommended','review','missing']},reason:{type:'string'}},required:['field','column','status','reason'],additionalProperties:false}}},required:['mappings'],additionalProperties:false};
export function validateMappings(value:unknown,ids:string[]):{mappings:Mapping[]}{
 const result=value as {mappings:Mapping[]};
 if(!result||!Array.isArray(result.mappings)||result.mappings.length!==fields.length||new Set(result.mappings.map(m=>m?.field)).size!==fields.length)throw new Error('Incomplete mappings');
 for(const m of result.mappings){if(!m||!fields.some(f=>f[0]===m.field)||typeof m.reason!=='string'||!['recommended','review','missing'].includes(m.status))throw new Error('Invalid mapping');if(m.column!==null&&!ids.includes(m.column))throw new Error('Unknown column');if((m.column===null)!==(m.status==='missing'))throw new Error('Inconsistent status');}
 return result;
}
