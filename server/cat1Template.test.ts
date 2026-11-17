import test from 'node:test';
import assert from 'node:assert/strict';
import {cat1Template} from '../src/cat1Template.js';
import {fields,templateRequirements} from '../src/shared.js';
test('template view preserves all template fields including KRW issue requirement and the original six sections',()=>{
 assert.deepEqual(cat1Template.map(g=>g.title),['A. 식별 정보','B. 조직 정보','C. 구매정보','D. 활동량','E. 구매금액','F. 기타']);
 const entries=cat1Template.flatMap(g=>g.fields);assert.equal(entries.length,23);assert.equal(new Set(entries.map(f=>f.id)).size,23);
 assert.equal(entries.filter(f=>f.requirement==='(자동)').length,4);assert.equal(entries.filter(f=>f.requirement==='필수').length,4);assert.equal(entries.filter(f=>f.requirement==='조건부 필수').length,8);
 for(const field of entries){assert.ok(field.rule);if(field.requirement!=='(자동)'){assert.ok(field.id in templateRequirements);assert.equal(fields.find(f=>f[0]===field.id)?.[1],field.label);}}
});
