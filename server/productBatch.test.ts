import test from 'node:test';
import assert from 'node:assert/strict';
import {codeInRange,validCodeRange,listedCodes} from '../src/productBatch';

test('code ranges include both endpoints and compare numeric suffixes',()=>{
 assert.equal(codeInRange('CHEM-0009','CHEM-9','CHEM-100'),true);
 assert.equal(codeInRange('CHEM-100','CHEM-9','CHEM-100'),true);
 assert.equal(codeInRange('CHEM-20','CHEM-9','CHEM-100'),true);
 assert.equal(codeInRange('CHEM-101','CHEM-9','CHEM-100'),false);
 assert.equal(codeInRange('CHEM-8','CHEM-9','CHEM-100'),false);
});
test('ranges require matching prefixes and do not accidentally select another code family',()=>{
 assert.equal(codeInRange('OTHER-20','CHEM-1','CHEM-30'),false);
 assert.equal(codeInRange('CHEM2-20','CHEM-1','CHEM-30'),false);
 assert.equal(validCodeRange('CHEM-1','OTHER-30'),false);
});
test('reversed, nonnumeric and unsafe integer ranges are rejected',()=>{
 assert.equal(validCodeRange('CHEM-30','CHEM-1'),false);
 assert.equal(validCodeRange('CHEM-A','CHEM-Z'),false);
 assert.equal(validCodeRange('CHEM-1','CHEM-9007199254740993'),false);
 assert.equal(validCodeRange(' CHEM-1 ',' CHEM-1 '),true);
});
test('pasted code lists trim, deduplicate and retain exact codes',()=>{
 assert.deepEqual([...listedCodes(' CHEM-001, CHEM-020\nCHEM-001\r\nCHEM-307,,')],['CHEM-001','CHEM-020','CHEM-307']);
 assert.equal(listedCodes('CHEM-001').has('CHEM-1'),false);
 assert.equal(listedCodes(' ,\n ').size,0);
});
