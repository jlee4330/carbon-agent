import test from 'node:test';
import assert from 'node:assert/strict';
import {repeatComparison} from '../src/repeatComparison';
const columns=['id','item','quantity','date'].map(id=>({id,name:id}));
const mappings=[{field:'order_id',column:'id',status:'recommended' as const,reason:''}];
test('comparison groups purchase IDs and marks differing columns and exact source rows separately',()=>{
 const rows=[['PO1','A','2','2025-01-01'],['PO2','B','1','2025-01-01'],['PO1','A','3','2025-02-01'],['PO1','A','2','2025-01-01']];
 const [group]=repeatComparison(columns,rows,mappings,[0,1,2,3]);assert.deepEqual(group.indices,[0,2,3]);assert.deepEqual([...group.changed],[2,3]);assert.deepEqual([...group.identical],[0,3]);assert.equal(group.keyIndex,0);
});
test('exact rows without purchase identifiers can still be compared',()=>{
 const rows=[['','A','2','2025-01-01'],['','A','2','2025-01-01']];const [group]=repeatComparison(columns,rows,[],[0,1]);assert.equal(group.changed.size,0);assert.equal(group.identical.size,2);
});
