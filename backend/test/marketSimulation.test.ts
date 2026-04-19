import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createRandomWalkPercent,
  getSimulationVariance,
  SIMULATION_VARIANCE_BY_TYPE,
} from '../src/config/marketSimulation';

test('market simulation uses asset-specific seed variance profiles', () => {
  assert.equal(
    getSimulationVariance('Forex', 'seed'),
    SIMULATION_VARIANCE_BY_TYPE.Forex.seedMaxChangePercent,
  );
  assert.equal(
    getSimulationVariance('Crypto', 'live'),
    SIMULATION_VARIANCE_BY_TYPE.Crypto.liveMaxChangePercent,
  );
});

test('market simulation generates bounded random walk percentages', () => {
  const liveVariance = SIMULATION_VARIANCE_BY_TYPE.Shares.liveMaxChangePercent;

  assert.equal(
    createRandomWalkPercent('Shares', 'live', () => 0),
    -liveVariance,
  );
  assert.equal(
    createRandomWalkPercent('Shares', 'live', () => 0.5),
    0,
  );
  assert.equal(
    createRandomWalkPercent('Shares', 'live', () => 1),
    liveVariance,
  );
});
