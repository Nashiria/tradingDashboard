const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:3000');
  await new Promise(r => setTimeout(r, 2000));
  
  const dims = await page.evaluate(() => {
    return {
      chartArea: document.querySelector('.chart-area')?.getBoundingClientRect().toJSON(),
      chartMain: document.querySelector('.chart-main')?.getBoundingClientRect().toJSON(),
      chartContainer: document.querySelector('.chart-container')?.getBoundingClientRect().toJSON(),
      chartWrapper: document.querySelector('.chart-wrapper')?.getBoundingClientRect().toJSON()
    };
  });
  console.log(dims);
  await browser.close();
})();
