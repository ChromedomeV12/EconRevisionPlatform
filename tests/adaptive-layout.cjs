const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const { createServer } = require('../scripts/serve.cjs');
const { choose } = require('../adaptive-layout.js');
async function resize(page, size) {
  await page.setViewportSize(size);
  // Browser versions deliver resize at different points relative to the protocol reply.
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}
(async () => {
  const server = createServer(); await new Promise(r => server.listen(0,'127.0.0.1',r));
  const base = `http://127.0.0.1:${server.address().port}`, out = path.join(__dirname,'../test-output/adaptive');
  fs.mkdirSync(out,{recursive:true}); let browser;
  try {
    browser = await chromium.launch({headless:true,...(process.env.BROWSER_CHANNEL ? {channel:process.env.BROWSER_CHANNEL} : {})});
    for (const theme of ['light','dark']) {
      const context = await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'});
      await context.addInitScript(theme => localStorage.setItem('econ-theme-v1',theme), theme);
      const page = await context.newPage(), errors=[]; page.on('pageerror',e=>errors.push(e.message));
      // Stop the deferred app: layout and CSS must already be correct before it runs.
      await page.route('**/app.js', route => route.abort());
      for (const [width,height] of [[1440,900],[390,844],[768,1024],[844,390]]) {
        await resize(page,{width,height}); await page.goto(base);
        assert.equal(await page.locator('html').getAttribute('data-layout'),choose(width,height));
        assert.equal(await page.locator('.topbar').isVisible(),choose(width,height)==='desktop');
      }
      await page.unroute('**/app.js'); await resize(page,{width:1440,height:900}); await page.goto(base);
      await page.evaluate(() => document.fonts.ready);
      await page.evaluate(() => {
        const state=EconLearning.empty(); EconLearning.rate(state,EconData.cards[0].id,3,new Date());
        localStorage.setItem('econ-workspace-v2',JSON.stringify(state));
      }); await page.reload();
      await page.locator('[data-point]').first().getByRole('button',{name:'Save point',exact:true}).click();
      await page.getByRole('button',{name:'Next point',exact:true}).click();
      await page.waitForFunction(()=>document.querySelector('.set-progress').getAttribute('aria-valuenow')==='2');
      const id=await page.locator('[data-feed-jump][aria-current]').getAttribute('data-id');
      let point=page.locator(`[data-point="${id}"]`);
      await point.getByRole('button',{name:'Save point',exact:true}).click();
      await point.getByRole('button',{name:'Revisit later',exact:true}).click();
      await page.locator('.refresh-filters [data-filter="saved"]').click();
      const before=await page.evaluate(()=>[localStorage.getItem('econ-workspace-v2'),localStorage.getItem('econ-refresh-v1')]);
      await page.screenshot({path:path.join(out,`desktop-${theme}.png`)});
      // Card nodes survive every switch, as do explicit filters and persisted data.
      await point.evaluate(el=>window.originalPoint=el);
      for (const [width,height] of [[390,844],[844,390],[768,1024],[1024,768],[719,600],[720,600],[999,1000],[1000,1400],[999,501],[999,500],[1440,900]]) {
        await resize(page,{width,height});
        await page.waitForFunction(expected=>document.documentElement.dataset.layout===expected,choose(width,height));
        await page.waitForFunction(id=>{
          const s=document.querySelector('.refresh-scroll'), node=s.querySelector(`[data-point="${id}"]`);
          return Math.abs(s.scrollTop-node.offsetTop)<2;
        },id);
        assert.ok(await point.evaluate(el=>el===window.originalPoint));
        assert.equal(await page.locator('.refresh-filters [aria-pressed="true"]').getAttribute('data-filter'),'saved');
        assert.deepEqual(await page.evaluate(()=>[localStorage.getItem('econ-workspace-v2'),localStorage.getItem('econ-refresh-v1')]),before);
        const swipe=choose(width,height)==='swipe';
        assert.equal(await page.locator('.feed-rail').isVisible(),swipe);
        assert.equal(await point.locator('.refresh-actions').isVisible(),!swipe);
        assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
        assert.ok(await page.evaluate(()=>{const ids=[...document.querySelectorAll('[id]')].map(el=>el.id);return ids.length===new Set(ids).size;}));
      }
      await resize(page,{width:390,height:844});
      const multi=page.getByRole('button',{name:'Card actions',exact:true});
      await multi.focus(); await page.keyboard.press('Enter');
      assert.equal(await page.getByRole('menuitemcheckbox',{name:'Bookmark card'}).getAttribute('aria-checked'),'true');
      await page.keyboard.press('Escape'); assert.ok(await multi.evaluate(el=>el===document.activeElement));
      await page.screenshot({path:path.join(out,`phone-${theme}.png`)});
      // Switching an open keyboard dial transfers focus away from hidden controls.
      await page.keyboard.press('Shift+F10'); assert.ok(await page.locator('.feed-dial').isVisible());
      await resize(page,{width:1440,height:900});
      await page.waitForFunction(()=>document.activeElement===document.querySelector('.refresh-scroll'));
      assert.equal(await page.locator('.feed-dial').isVisible(),false);
      await resize(page,{width:390,height:844});
      const bounds=await multi.boundingBox();
      await page.mouse.move(bounds.x+bounds.width/2,bounds.y+bounds.height/2); await page.mouse.down();
      await page.waitForTimeout(430); assert.ok(await page.locator('.feed-dial').isVisible());
      await resize(page,{width:1440,height:900}); await page.mouse.up();
      assert.equal(await page.locator('.feed-dial').isVisible(),false);
      assert.equal(await page.locator('#feedActionMenu').isVisible(),false);
      assert.equal(new URL(page.url()).hash,'');
      await point.getByRole('button',{name:'Closer look',exact:true}).click();
      await resize(page,{width:390,height:844});
      assert.ok(await page.locator('#modal').isVisible());
      assert.ok(await page.evaluate(()=>document.activeElement.closest('#modal')!==null));
      await page.keyboard.press('Escape');
      await page.waitForFunction(()=>document.activeElement===document.querySelector('.refresh-scroll'));
      await resize(page,{width:1440,height:900});
      const openedBefore = await page.evaluate(id=>JSON.parse(localStorage.getItem('econ-refresh-v1')).opened[id],id);
      await page.getByRole('button',{name:'Previous point',exact:true}).click();
      await page.waitForFunction(()=>document.querySelector('.set-progress').getAttribute('aria-valuenow')==='1');
      await page.getByRole('button',{name:'Next point',exact:true}).click();
      await page.waitForFunction(()=>document.querySelector('.set-progress').getAttribute('aria-valuenow')==='2');
      assert.ok(await page.evaluate(({id,openedBefore})=>JSON.parse(localStorage.getItem('econ-refresh-v1')).opened[id]>openedBefore,{id,openedBefore}), 'A later explicit visit still updates exposure');
      // All sequential focus targets belong to the visible layout.
      await page.locator('.refresh-scroll').focus();
      for (let i=0;i<6;i++) { await page.keyboard.press('Tab'); assert.ok(await page.evaluate(()=>!document.activeElement.closest('.feed-gesture-controls'))); }
      await resize(page,{width:390,height:844}); await multi.focus();
      for (let i=0;i<6;i++) { await page.keyboard.press('Tab'); assert.ok(await page.evaluate(()=>!document.activeElement.closest('.refresh-actions,.refresh-heading,.sidebar,.topbar,.desktop-feed-navigation'))); }
      assert.deepEqual(errors,[]); await context.close();
    }
    const touch=await browser.newContext({viewport:{width:900,height:1000},hasTouch:true,isMobile:true});
    const page=await touch.newPage(); await page.goto(base);
    await page.evaluate(()=>{ Object.defineProperty(window,'innerHeight',{configurable:true,value:600}); dispatchEvent(new Event('resize')); });
    assert.equal(await page.locator('html').getAttribute('data-layout'),'swipe','Touch browser chrome cannot choose desktop');
    // Explicit orientation notification must use new geometry even at the same width.
    await page.evaluate(()=>screen.orientation.dispatchEvent(new Event('change')));
    await page.waitForFunction(()=>document.documentElement.dataset.layout==='desktop');
    await touch.close();
    console.log('Adaptive layouts: pre-app rendering, both themes, geometry boundaries, resizing/rotation, focus, unchanged card nodes/filter/storage/recall, screenshots passed.');
  } finally { await browser?.close(); await new Promise(r=>server.close(r)); }
})().catch(e=>{console.error(e);process.exitCode=1;});
