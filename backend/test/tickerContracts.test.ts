import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseHistoryQuery,
  parseTickerSymbol,
} from '../src/api/contracts/tickerContracts';

test('parseHistoryQuery normalizes valid query values', () => {
  const result = parseHistoryQuery({
    symbol: ' eur/usd ',
    limit: '25',
    from: '1000',
    to: '2000',
  });

  assert.deepEqual(result, {
    value: {
      symbol: 'EUR/USD',
      limit: 25,
      from: 1000,
      to: 2000,
    },
  });
});

test('parseHistoryQuery returns validation errors for bad input', () => {
  const result = parseHistoryQuery({
    symbol: 'bad symbol!',
    limit: '0',
    from: '500',
    to: '100',
  });

  assert.equal(result.value, undefined);
  assert.deepEqual(result.errors, [
    {
      field: 'symbol',
      message:
        'Symbol must contain only letters, numbers, slashes, or dashes and be at most 15 characters.',
      value: 'bad symbol!',
    },
    {
      field: 'limit',
      message: 'limit must be between 1 and 600.',
      value: 0,
    },
    {
      field: 'from',
      message:
        'The from timestamp must be less than or equal to the to timestamp.',
      value: 500,
    },
  ]);
});

test('parseTickerSymbol normalizes path parameters', () => {
  const result = parseTickerSymbol(' btc-usd ');

  assert.deepEqual(result, {
    value: {
      symbol: 'BTC-USD',
    },
  });
});

test('parseTickerSymbol returns validation errors for invalid symbols', () => {
  const result = parseTickerSymbol('bad symbol!');

  assert.equal(result.value, undefined);
  assert.deepEqual(result.errors, [
    {
      field: 'symbol',
      message:
        'Symbol must contain only letters, numbers, slashes, or dashes and be at most 15 characters.',
      value: 'bad symbol!',
    },
  ]);
});
