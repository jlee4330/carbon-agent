import {test} from 'node:test';
import assert from 'node:assert/strict';
import {advanceHistory,invalidateReview,type Step} from '../src/history.js';
test('retains unsure branch when the user obtains purchase records',()=>{
 let history:Step[]=[];
 for(const step of ['intro','question','unsure','upload','analyzing','mapping'] as Step[])history=advanceHistory(history,step);
 assert.deepEqual(history,['intro','question','unsure','upload','analyzing','mapping']);
});
test('returning to a question removes the previous downstream route',()=>{
 const back=advanceHistory(['intro','question','unsure','upload','mapping'],'question');
 assert.deepEqual(advanceHistory(back,'none'),['intro','question','none']);
});
test('changing purchase data invalidates review while preserving acquisition history',()=>{
 assert.deepEqual(invalidateReview(['intro','question','unsure','upload','analyzing','mapping','done']),['intro','question','unsure','upload']);
});
test('category navigation does not create a decision node or duplicate current steps',()=>{
 assert.deepEqual(advanceHistory(['intro','question'],'categories'),['intro','question']);
 assert.deepEqual(advanceHistory(['intro','question'],'question'),['intro','question']);
});
