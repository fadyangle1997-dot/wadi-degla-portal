const { chromium } = require('playwright');
(async () => {
  const files = process.argv.slice(2);
  const b = await chromium.launch();
  const p = await b.newPage({ viewport:{width:1080,height:1350}, deviceScaleFactor:1 });
  for (const f of files) {
    await p.goto('file://' + process.cwd() + '/' + f, { waitUntil:'networkidle' });
    await p.evaluate(() => document.fonts.ready);
    const fams = await p.evaluate(() => [...new Set([...document.fonts].filter(x=>x.status==='loaded').map(x=>x.family))]);
    console.log(f, 'fonts:', fams.join(', '));
    await p.screenshot({ path: f.replace('.html','.png') });
  }
  await b.close();
})();
