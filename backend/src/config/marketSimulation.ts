import { TickerType } from '../domain/models/Ticker';

export type SimulationPhase = 'seed' | 'live';

export interface SimulationVarianceProfile {
  seedMaxChangePercent: number;
  liveMaxChangePercent: number;
}

export const SIMULATION_VARIANCE_BY_TYPE: Readonly<
  Record<TickerType, SimulationVarianceProfile>
> = {
  Forex: {
    seedMaxChangePercent: 0.0012,
    liveMaxChangePercent: 0.0024,
  },
  Metals: {
    seedMaxChangePercent: 0.0018,
    liveMaxChangePercent: 0.0035,
  },
  Shares: {
    seedMaxChangePercent: 0.0025,
    liveMaxChangePercent: 0.005,
  },
  Crypto: {
    seedMaxChangePercent: 0.004,
    liveMaxChangePercent: 0.008,
  },
  Indices: {
    seedMaxChangePercent: 0.0015,
    liveMaxChangePercent: 0.003,
  },
  Commodities: {
    seedMaxChangePercent: 0.002,
    liveMaxChangePercent: 0.004,
  },
};

export function getSimulationVariance(
  tickerType: TickerType,
  phase: SimulationPhase,
): number {
  const profile = SIMULATION_VARIANCE_BY_TYPE[tickerType];

  return phase === 'seed'
    ? profile.seedMaxChangePercent
    : profile.liveMaxChangePercent;
}

export function createRandomWalkPercent(
  tickerType: TickerType,
  phase: SimulationPhase,
  random: () => number = Math.random,
): number {
  const maxChangePercent = getSimulationVariance(tickerType, phase);

  return random() * (maxChangePercent * 2) - maxChangePercent;
}
