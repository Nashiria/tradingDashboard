const testData = require('./frontend/src/services/mockMarketData');
const data = testData.createMockHistory('EUR/USD');

const interval = 5000;
const groups = new Map();

data.forEach((tick) => {
  const timeBucket = Math.floor(tick.timestamp / interval) * interval;
  if (!groups.has(timeBucket)) {
    groups.set(timeBucket, []);
  }

  const bucket = groups.get(timeBucket);
  if (bucket) {
    bucket.push(tick);
  }
});

const toChartTimestamp = (timestamp) => Math.floor(timestamp / 1000);

const ohlcData = Array.from(groups.entries())
  .sort(([timeA], [timeB]) => timeA - timeB)
  .map(([timeBucket, ticks]) => {
    ticks.sort((a, b) => a.timestamp - b.timestamp);

    const open = ticks[0].price;
    const close = ticks[ticks.length - 1].price;
    const high = Math.max(...ticks.map((t) => t.price));
    const low = Math.min(...ticks.map((t) => t.price));

    return {
      time: toChartTimestamp(timeBucket),
      open,
      high,
      low,
      close,
    };
  });

for (let i = 1; i < ohlcData.length; i++) {
  ohlcData[i].open = ohlcData[i - 1].close;

  if (ohlcData[i].open > ohlcData[i].high) ohlcData[i].high = ohlcData[i].open;
  if (ohlcData[i].open < ohlcData[i].low) ohlcData[i].low = ohlcData[i].open;
}

let lastTime = 0;
let hasError = false;
for (const p of ohlcData) {
  if (lastTime && p.time <= lastTime) {
    console.error('ERROR: Not strictly increasing!', lastTime, p.time);
    hasError = true;
  }
  lastTime = p.time;
}
if (!hasError) {
  console.log('SUCCESS. Data points:', ohlcData.length);
}
