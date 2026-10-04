const {test}=require('node:test');
const assert=require('node:assert/strict');
const R=require('../refresh.js');
test('Browsing state validates IDs and timestamps without inventing recall',()=>{
  const state=R.load({getItem:()=>JSON.stringify({version:1,opened:{one:'2026-10-04T12:00:00Z',two:'bad',missing:'2026-10-04T12:00:00Z'},revisit:['one','one','missing'],confusing:[],current:'missing'})},['one','two']);
  assert.deepEqual(state.revisit,['one']);assert.deepEqual(Object.keys(state.opened),['one']);assert.equal(state.current,null);
  R.open(state,'two',new Date('2026-10-04T13:00:00Z'));
  assert.equal(state.current,'two');assert.equal(state.logs,undefined);assert.equal(state.cards,undefined);
});
test('Revisit and confusing are independent reversible preferences',()=>{
  const state=R.empty();R.toggle(state,'revisit','one');R.toggle(state,'confusing','one');R.toggle(state,'revisit','one');
  assert.deepEqual(state.revisit,[]);assert.deepEqual(state.confusing,['one']);assert.throws(()=>R.toggle(state,'rating','one'));
});
test('Invalid or blocked storage gives empty browsing state',()=>{
  assert.deepEqual(R.load({getItem:()=>'{bad'},[]),R.empty());assert.deepEqual(R.load({getItem:()=>{throw Error('blocked');}},[]),R.empty());
});
