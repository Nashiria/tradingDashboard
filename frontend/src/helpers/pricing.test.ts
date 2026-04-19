import { DEFAULT_SIMULATED_SPREAD_PIPS, getSimulatedQuote } from './pricing';

describe('getSimulatedQuote', () => {
  test('builds a consistent simulated quote from the current price', () => {
    const quote = getSimulatedQuote(1.23456);

    expect(quote.spreadPips).toBe(DEFAULT_SIMULATED_SPREAD_PIPS);
    expect(quote.spreadAmount).toBeCloseTo(0.00013);
    expect(quote.bidPrice).toBe(1.23456);
    expect(quote.askPrice).toBeCloseTo(1.23469);
  });

  test('supports a custom simulated spread', () => {
    const quote = getSimulatedQuote(100, 2.5);

    expect(quote.spreadPips).toBe(2.5);
    expect(quote.spreadAmount).toBeCloseTo(0.00025);
    expect(quote.askPrice).toBeCloseTo(100.00025);
  });
});
