import type { AlertController } from '../api/controllers/AlertController';
import type { AuthController } from '../api/controllers/AuthController';
import type { AlertService } from '../business/services/AlertService';
import type { AuthService } from '../business/services/AuthService';
import type { TickerController } from '../api/controllers/TickerController';
import type { MarketDataService } from '../business/services/MarketDataService';
import type { MockUserCredentials } from '../domain/models/Auth';
import type { Ticker } from '../domain/models/Ticker';
import type { IAlertRepository } from '../domain/repositories/IAlertRepository';
import type { IMarketDataRepository } from '../domain/repositories/IMarketDataRepository';
import type { DependencyToken } from './container';

// A generic type for the Redis client
export type RedisClient = any;

export const TOKENS = {
  redisClient: Symbol('redisClient') as DependencyToken<RedisClient>,
  tickerCatalog: Symbol('tickerCatalog') as DependencyToken<readonly Ticker[]>,
  mockUsers: Symbol('mockUsers') as DependencyToken<
    readonly MockUserCredentials[]
  >,
  authSecret: Symbol('authSecret') as DependencyToken<string>,
  alertRepository: Symbol(
    'alertRepository',
  ) as DependencyToken<IAlertRepository>,
  marketDataRepository: Symbol(
    'marketDataRepository',
  ) as DependencyToken<IMarketDataRepository>,
  authService: Symbol('authService') as DependencyToken<AuthService>,
  alertService: Symbol('alertService') as DependencyToken<AlertService>,
  marketDataService: Symbol(
    'marketDataService',
  ) as DependencyToken<MarketDataService>,
  authController: Symbol('authController') as DependencyToken<AuthController>,
  alertController: Symbol(
    'alertController',
  ) as DependencyToken<AlertController>,
  tickerController: Symbol(
    'tickerController',
  ) as DependencyToken<TickerController>,
} as const;
