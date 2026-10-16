const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  for (const [w,h,n] of [[1080,1350,'cover_4x5'],[1080,1920,'cover_9x16'],[1920,1080,'thumb_16x9']]) {
    const p = await b.newPage({ viewport:{width:w,height:h} });
    await p.goto('file://'+process.cwd()+`/cover.html?w=${w}&h=${h}`, {waitUntil:'networkidle'});
    await p.evaluate(()=>document.fonts.ready); await p.waitForFunction(()=>window.__fit===true);
    await p.screenshot({ path: `${n}.png` }); await p.close(); console.log(n);
  }
  await b.close();
})();
