import { fields, type Column, type Mapping } from './shared';

export function mappedColumns(mappings: Mapping[]): Column[] {
 return [...fields.map(([id,name])=>({id,name})), ...mappings.filter(mapping=>mapping.field.startsWith('custom_')).map(mapping=>({id:mapping.field,name:mapping.label||'추가 컬럼'}))];
}

export function mappingProjection(columns: Column[], mappings: Mapping[]): number[] {
 return mappedColumns(mappings).map(({id:field}) => {
  const mapping = mappings.find(value => value.field === field);
  return columns.findIndex(column => column.id === mapping?.column);
 });
}
