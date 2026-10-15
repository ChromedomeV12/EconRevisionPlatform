const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const { choose } = require('../adaptive-layout.js');
test('geometry boundaries deliberately include portrait tablets and landscape phones', () => {
  for (const [w,h,expected] of [[599,300,'swipe'],[600,501,'swipe'],[600,500,'swipe'],[720,600,'desktop'],[719,600,'swipe'],[999,1000,'swipe'],[1000,1400,'desktop'],[844,390,'swipe'],[999,500,'swipe'],[999,501,'desktop'],[1024,768,'desktop'],[768,1024,'swipe']]) assert.equal(choose(w,h),expected,`${w}x${h}`);
});
test('head bootstrap sets layout synchronously and ignores touch chrome and keyboard height changes', () => {
  const events = {}, root = { dataset: {} }, orientation = {};
  const context = {
    innerWidth: 900, innerHeight: 1000,
    document: { documentElement: root, activeElement: { matches: () => false } },
    matchMedia: () => ({ matches: true }), Event,
    addEventListener: (name, fn) => events[name] = fn,
    screen: { orientation: { addEventListener: (name, fn) => orientation[name] = fn } },
  };
  context.window = { dispatchEvent() {} };
  vm.runInNewContext(fs.readFileSync(require.resolve('../adaptive-layout.js'), 'utf8'), context);
  assert.equal(root.dataset.layout,'swipe');
  context.innerHeight = 600; events.resize(); assert.equal(root.dataset.layout,'swipe');
  context.innerWidth = 1100; events.resize(); assert.equal(root.dataset.layout,'desktop');
  context.innerWidth = 900; context.innerHeight = 600; events.resize(); assert.equal(root.dataset.layout,'desktop');
  context.innerHeight = 1000; orientation.change(); assert.equal(root.dataset.layout,'swipe');
  context.matchMedia = () => ({ matches: false });
  context.document.activeElement.matches = () => true;
  context.innerHeight = 600; events.resize(); assert.equal(root.dataset.layout,'swipe');
  context.document.activeElement.matches = () => false;
  events.resize(); assert.equal(root.dataset.layout,'desktop');
});
