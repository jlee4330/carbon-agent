import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mappingProjection } from '../src/mapping.ts';
import { fields,fieldGroups,type Mapping } from '../src/shared.ts';

test('preview uses column IDs for duplicate headers and reflects corrected mappings', () => {
 const columns = [{ id: 'c0', name: '수량' }, { id: 'c1', name: '수량' }];
 const mappings: Mapping[] = [{ field: 'quantity', column: 'c1', status: 'review', reason: '입고수량 확인' }];
 const before = mappingProjection(columns, mappings);
 assert.equal(before[6], 1);
 assert.equal(before[0], -1);
 const row = ['100', '0'];
 assert.equal(row[before[6]], '0');
 const after = mappingProjection(columns, [{ ...mappings[0], column: 'c0' }]);
 assert.equal(row[after[6]], '100');
 assert.equal(mappingProjection(columns, [{ ...mappings[0], column: null, status: 'missing' }])[6], -1);
});

test('custom columns keep labels and source IDs without displacing standard fields', async () => {
 const { mappedColumns } = await import('../src/mapping.ts');
 const columns = [{id:'c0',name:'Plant'},{id:'c1',name:'Warehouse'}];
 const maps:Mapping[]=[{field:'custom_one',label:'사업장',column:'c0',status:'recommended',reason:''},{field:'custom_two',label:'창고',column:null,status:'missing',reason:''}];
 assert.deepEqual(mappedColumns(maps).slice(fields.length),[{id:'custom_one',name:'사업장'},{id:'custom_two',name:'창고'}]);
 assert.deepEqual(mappingProjection(columns,maps).slice(fields.length),[0,-1]);
 assert.equal(mappedColumns(maps.filter(mapping=>mapping.field!=='custom_one')).length,fields.length+1);
 assert.equal(JSON.parse(JSON.stringify(maps))[0].label,'사업장');
});

test('ERP concepts stay separate through mapping and preview without selecting a calculation basis',()=>{
 const names=['order_quantity','receipt_quantity','invoice_quantity','order_unit','receipt_unit','invoice_unit','order_date','receipt_date','invoice_date','tax','refund','specification'];
 const columns=names.map(id=>({id,name:id}));
 const mappings:Mapping[]=names.map(field=>({field,column:field,status:'recommended',reason:''}));
 const projection=mappingProjection(columns,mappings);
 for(const name of names)assert.equal(projection[fields.findIndex(f=>f[0]===name)],columns.findIndex(c=>c.id===name));
 assert.equal(projection[fields.findIndex(f=>f[0]==='quantity')],-1);
 assert.equal(projection[fields.findIndex(f=>f[0]==='unit')],-1);
 const grouped=fieldGroups.flatMap(group=>[...group.ids]);assert.equal(new Set(grouped).size,fields.length);assert.deepEqual(new Set(grouped),new Set(fields.map(f=>f[0])));
});
test('Cat 1 template separates output requirements from supporting ERP fields and automatic fields',async()=>{
 const {templateRequirements,automaticTemplateFields}=await import('../src/shared');
 assert.deepEqual(Object.keys(templateRequirements).filter(id=>templateRequirements[id]==='필수'),['receipt_date','item','purchase_type','major_category']);
 for(const id of ['material_composition','receipt_weight','weight_unit'])assert.equal(templateRequirements[id],'중량 기반');
 for(const id of ['eeio_category','amount','currency','vat_included'])assert.equal(templateRequirements[id],'비용 기반');
 assert.equal(Object.keys(templateRequirements).length,19);
 for(const field of automaticTemplateFields)assert.ok(!fields.some(([id])=>String(id)===field.id));
 assert.ok(fieldGroups.find(group=>group.id==='support')?.ids.includes('code'));
});
