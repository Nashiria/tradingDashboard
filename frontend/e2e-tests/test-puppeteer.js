const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  await page.goto('http://localhost:3000');
  await new Promise(r => setTimeout(r, 2000));
  
  const computed = await page.evaluate(() => {
    const el = document.querySelector('.chart-wrapper');
    const style = window.getComputedStyle(el);
    const parent = document.querySelector('.chart-container');
    const pStyle = window.getComputedStyle(parent);
    return {
      wrapperPosition: style.position,
      wrapperTop: style.top,
      wrapperBottom: style.bottom,
      wrapperHeight: style.height,
      parentPosition: pStyle.position,
      parentHeight: pStyle.height
    };
  });
  console.log(computed);
  
  await browser.close();
})();
