const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const { createServer } = require("../scripts/serve.cjs");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
(async () => {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const out = path.join(__dirname, "../test-output");
  fs.mkdirSync(out, { recursive: true });
  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      ...(process.env.BROWSER_CHANNEL
        ? { channel: process.env.BROWSER_CHANNEL }
        : {}),
    });
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1050 },
    });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(base);
    await page.evaluate(() => document.fonts.ready);
    assert.equal(await page.locator("h1").textContent(), "Economics, refreshed.");
    assert.equal(await page.locator("#recallAnswer,[data-action=reveal],[data-action=rate]").count(), 0);
    await page.evaluate(() => {
      const old = EconLearning.empty();
      EconLearning.rate(old, "demand", 3, new Date());
      localStorage.setItem("econ-workspace-v2", JSON.stringify(old));
    });
    await page.reload();
    const oldReviews = await page.evaluate(() => JSON.stringify(JSON.parse(localStorage.getItem("econ-workspace-v2")).logs));
    const position = async (n) => page.waitForFunction(n => document.querySelector("#refreshPosition")?.textContent.startsWith(n + " /"), n);
    await position(1);
    await page.screenshot({path:path.join(out,"feed-desktop.png")});
    const first = page.locator("[data-point]").first();
    assert.ok(await first.locator("canvas").evaluate(c => c.getContext("2d").getImageData(0,0,c.width,c.height).data.some((v,i)=>i%4===3&&v>0)));
    await first.getByRole("button",{name:"Save point",exact:true}).click();
    await first.getByRole("button",{name:"Revisit later",exact:true}).click();
    await first.getByRole("button",{name:"Flag as confusing",exact:true}).click();
    await first.getByRole("button",{name:"Closer look",exact:true}).click();
    await page.getByRole("button",{name:"Close dialog"}).click();
    await page.getByRole("button",{name:"Next point",exact:true}).click();await position(2);
    await page.locator(".refresh-scroll").focus();await page.keyboard.press("ArrowDown");await position(3);
    await page.locator(".refresh-scroll").hover();await page.mouse.wheel(0,700);await position(4);
    await page.locator('[data-action="feed-filter"][data-filter="revisit"]').click();await position(1);
    assert.equal(await page.locator("[data-point]").count(),1);
    await page.locator('[data-action="feed-filter"][data-filter="all"]').click();
    assert.equal(await page.locator("[data-point]").count(),10);
    assert.equal(await page.evaluate(() => JSON.stringify(JSON.parse(localStorage.getItem("econ-workspace-v2")).logs)),oldReviews);
    await page.getByRole("link", {name:"Overview",exact:true}).click();
    await page.locator(".stats-grid").waitFor();
    assert.match(await page.locator(".stats-grid").innerText(),/Points opened/);
    assert.doesNotMatch(await page.locator(".stats-grid").innerText(),/Recall rate|Cards reviewed/);
    await page.screenshot({path:path.join(out,"dashboard-desktop.png"),fullPage:true});
    await page.reload();
    assert.equal(await page.evaluate(() => JSON.stringify(JSON.parse(localStorage.getItem("econ-workspace-v2")).logs)),oldReviews);
    await page.locator('[data-nav="units"]').click();
    await page
      .getByRole("searchbox", { name: "Search topics" })
      .fill("inflation");
    assert.equal(await page.locator(".library-card").count(), 1);
    await page.screenshot({
      path: path.join(out, "library-desktop.png"),
      fullPage: true,
    });
    await page.getByRole("link", { name: "Saved cards" }).click();
    assert.equal(await page.locator(".library-card").count(), 1);
    assert.match(await page.locator(".library-card h3").textContent(), /Negative externalities/);
    await page.getByRole("link", { name: "Card studio" }).click();
    await page
      .getByLabel("Card title")
      .fill("Test card <img src=x onerror=bad()>");
    await page
      .getByLabel("Recall question")
      .fill("What does an opportunity cost describe?");
    await page
      .getByLabel("Reference answer")
      .fill(
        "The value of the next-best alternative forgone when making a choice.",
      );
    await page
      .getByLabel("Source & page reference")
      .fill("Original personal example");
    await page.getByRole("button", { name: "Submit for review" }).click();
    assert.equal(await page.locator(".review-row img").count(), 0);
    assert.match(await page.locator(".review-row h3").textContent(), /<img/);
    await page.getByRole("button", { name: "Review", exact: true }).click();
    await page.getByLabel("Review note").fill("Add the next-best alternative distinction.");
    await page.getByRole("button", { name: "Request changes" }).click();
    await page.getByRole("tab", { name: "My submissions" }).click();
    await page.getByRole("button", { name: "Revise", exact: true }).click();
    await page.getByRole("button", { name: "Resubmit for review" }).click();
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem("econ-workspace-v2")).submissions[0].version), 2);
    await page.getByRole("button", { name: "Review", exact: true }).click();
    await page.getByRole("button", { name: "Add to my library" }).click();
    assert.equal(
      await page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("econ-workspace-v2")).submissions[0]
            .status,
      ),
      "pending",
    );
    await page.locator("#reviewConfirmed").check();
    await page.getByRole("button", { name: "Add to my library" }).click();
    assert.equal(
      await page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("econ-workspace-v2")).submissions[0]
            .status,
      ),
      "approved",
    );
    await page.getByRole("tab", { name: "My submissions" }).click();
    await page.screenshot({
      path: path.join(out, "studio-desktop.png"),
      fullPage: true,
    });
    await page.getByRole("button", { name: "Study settings" }).click();
    await page.getByLabel("Legacy recall goal").fill("3");
    await page.getByRole("button", { name: "Save settings" }).click();
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem("econ-workspace-v2")).goal), 3);
    await page.waitForFunction(
      () => !document.querySelector("#toast").classList.contains("visible"),
    );
    for (const width of [360, 390, 768, 1280, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      for (const view of ["progress", "feed", "units", "saved", "studio"]) {
        await page.goto(`${base}/#${view}`);
        await page.waitForFunction(
          (view) =>
            document
              .querySelector(`[data-nav="${view}"]`)
              .getAttribute("aria-current") === "page",
          view,
        );
        await page.evaluate(() => document.fonts.ready);
        assert.ok(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
          `${view}: overflow at ${width}`,
        );
        if (width === 390)
          await page.screenshot({
            path: path.join(out, `${view}-mobile.png`),
            fullPage: true,
          });
      }
    }
    assert.equal(
      (
        await page.request.get(
          `${base}/private-sources/Econ%20Revision%20App%20Sources/START_HERE.md`,
        )
      ).status(),
      404,
    );
    for (const [width,height] of [[360,740],[390,844],[768,900],[1024,768],[1440,900]]) {
      await page.setViewportSize({width,height});
      await page.goto(`${base}/#feed`);
      await page.locator('.refresh-scroll').waitFor();
      const count=await page.locator('[data-point]').count();
      for(let i=0;i<count;i++) {
        await page.locator('.refresh-scroll').evaluate((el,i)=>el.scrollTo({top:el.children[i].offsetTop,behavior:'instant'}),i);
        await page.waitForFunction(i=>document.querySelector('#refreshPosition').textContent.startsWith((i+1)+' /'),i);
        const metrics=await page.locator('[data-point]').nth(i).evaluate(el=>{
          const body=el.querySelector('.refresh-body'),actions=el.querySelector('footer').getBoundingClientRect();
          return {extra:body.scrollHeight-body.clientHeight,bottom:actions.bottom};
        });
        assert.ok(metrics.extra<=1,`Internal scroll at ${width} card ${i}: ${metrics.extra}`);
        assert.ok(metrics.bottom<=height-(width<=650?67:0),`Actions covered at ${width} card ${i}`);
        assert.ok(await page.locator('[data-point]').nth(i).locator('canvas').evaluate(c=>c.getContext('2d').getImageData(0,0,c.width,c.height).data.some((v,j)=>j%4===3&&v>0)));
        if(i===0||i===4)await page.screenshot({path:path.join(out,`refresh-${i}-${width}.png`)});
      }
    }
    await page.goto(`${base}/TikTok%20Econ.html#feed`);
    await page.waitForURL("**/index.html#feed");
    await page.getByRole("button", { name: "Study settings" }).click();
    await page.getByRole("button", { name: "Reset reviews", exact: true }).click();
    await page.getByRole("button", { name: "Reset reviews", exact: true }).click();
    const reset = await page.evaluate(() => JSON.parse(localStorage.getItem("econ-workspace-v2")));
    assert.equal(reset.logs.length, 0);
    assert.equal(reset.saved.length, 1);
    assert.equal(reset.submissions.length, 1);
    const context = await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:"reduce"});
    const mobile = await context.newPage();await mobile.goto(base);
    await mobile.waitForFunction(()=>document.querySelector("#refreshPosition")?.textContent.startsWith("1 /"));
    const cdp=await context.newCDPSession(mobile);
    await cdp.send("Input.dispatchTouchEvent",{type:"touchStart",touchPoints:[{x:180,y:570}]});
    for(let y=550;y>=180;y-=20){await cdp.send("Input.dispatchTouchEvent",{type:"touchMove",touchPoints:[{x:180,y}]});await new Promise(r=>setTimeout(r,16));}
    await cdp.send("Input.dispatchTouchEvent",{type:"touchEnd",touchPoints:[]});
    await mobile.waitForFunction(()=>document.querySelector("#refreshPosition")?.textContent.startsWith("2 /"));
    await context.close();
    assert.deepEqual(errors, []);
    console.log(
      "Browser checks passed: refresh feed, browsing preferences, unchanged recall history, saved cards, search, submission approval, escaping, assets, redirect, private isolation, 5 responsive widths.",
    );
  } finally {
    if (browser) await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
