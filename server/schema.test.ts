import {test} from 'node:test';
import assert from 'node:assert/strict';
import {inputSchema,validateMappings} from './schema.js';
import {fields} from '../src/shared.js';
const valid=()=>({mappings:fields.map(f=>({field:f[0],column:null,status:'missing' as const,reason:'없음'}))});
test('accepts bounded table and valid missing mappings',()=>{assert.equal(inputSchema.safeParse({columns:[{id:'c0',name:'금액'}],rows:[['1200']]}).success,true);assert.doesNotThrow(()=>validateMappings(valid(),['c0']));});
test('rejects duplicated column IDs, malformed rows, and empty data',()=>{for(const data of [{columns:[{id:'c0',name:'a'},{id:'c0',name:'b'}],rows:[]},{columns:[{id:'c0',name:'a'}],rows:[[]]},{columns:[{id:'c0',name:'a'}],rows:[]}])assert.equal(inputSchema.safeParse(data).success,false);});
test('rejects invented columns and duplicate or missing mappings',()=>{const a:any=valid();a.mappings[0]={...a.mappings[0],column:'invented',status:'recommended'};assert.throws(()=>validateMappings(a,['c0']));const b=valid();b.mappings[1]=b.mappings[0];assert.throws(()=>validateMappings(b,[]));assert.throws(()=>validateMappings({mappings:[]},[]));});
test('rejects contradictory mapping status',()=>{const a:any=valid();a.mappings[0].status='recommended';assert.throws(()=>validateMappings(a,[]));});
