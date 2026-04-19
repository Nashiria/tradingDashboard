import { AlertController } from './api/controllers/AlertController';
import { AuthController } from './api/controllers/AuthController';
import { AlertService } from './business/services/AlertService';
import { AuthService } from './business/services/AuthService';
import { TickerController } from './api/controllers/TickerController';
import { MarketDataService } from './business/services/MarketDataService';
import { DEFAULT_TICKERS } from './config/marketTickers';
import { MOCK_USERS } from './config/mockUsers';
import { MockUserCredentials } from './domain/models/Auth';
import { Ticker } from './domain/models/Ticker';
import { IAlertRepository } from './domain/repositories/IAlertRepository';
import { IMarketDataRepository } from './domain/repositories/IMarketDataRepository';
import { RedisAlertRepository } from './infrastructure/repositories/RedisAlertRepository';
import { RedisMarketDataRepository } from './infrastructure/repositories/RedisMarketDataRepository';
import { redisClient } from './infrastructure/redis/redisClient';
import { DependencyContainer } from './di/container';
import { TOKENS } from './di/tokens';

export interface ApplicationContextOverrides {
  tickerCatalog?: readonly Ticker[];
  mockUsers?: readonly MockUserCredentials[];
  authSecret?: string;
  redisClient?: any;
  alertRepository?: IAlertRepository;
  marketDataRepository?: IMarketDataRepository;
  authService?: AuthService;
  alertService?: AlertService;
  marketDataService?: MarketDataService;
  authController?: AuthController;
  alertController?: AlertController;
  tickerController?: TickerController;
}

export interface ApplicationContext {
  container: DependencyContainer;
  tickerCatalog: readonly Ticker[];
  authService: AuthService;
  alertService: AlertService;
  marketDataRepository: IMarketDataRepository;
  alertRepository: IAlertRepository;
  marketDataService: MarketDataService;
  authController: AuthController;
  alertController: AlertController;
  tickerController: TickerController;
}

export function createApplicationContext(
  overrides: ApplicationContextOverrides = {},
): ApplicationContext {
  const container = new DependencyContainer();

  container.registerInstance(
    TOKENS.tickerCatalog,
    overrides.tickerCatalog ?? DEFAULT_TICKERS,
  );
  container.registerInstance(
    TOKENS.mockUsers,
    overrides.mockUsers ?? MOCK_USERS,
  );
  container.registerInstance(
    TOKENS.authSecret,
    overrides.authSecret ?? process.env.AUTH_SECRET ?? 'mockbank-local-secret',
  );

  container.registerInstance(
    TOKENS.redisClient,
    overrides.redisClient ?? redisClient,
  );

  if (overrides.alertRepository) {
    container.registerInstance(
      TOKENS.alertRepository,
      overrides.alertRepository,
    );
  } else {
    container.registerSingleton(
      TOKENS.alertRepository,
      (currentContainer) =>
        new RedisAlertRepository(currentContainer.resolve(TOKENS.redisClient)),
    );
  }

  if (overrides.marketDataRepository) {
    container.registerInstance(
      TOKENS.marketDataRepository,
      overrides.marketDataRepository,
    );
  } else {
    container.registerSingleton(
      TOKENS.marketDataRepository,
      (currentContainer) =>
        new RedisMarketDataRepository(
          currentContainer.resolve(TOKENS.redisClient),
        ),
    );
  }

  if (overrides.authService) {
    container.registerInstance(TOKENS.authService, overrides.authService);
  } else {
    container.registerSingleton(
      TOKENS.authService,
      (currentContainer) =>
        new AuthService(
          currentContainer.resolve(TOKENS.mockUsers),
          currentContainer.resolve(TOKENS.authSecret),
        ),
    );
  }

  if (overrides.alertService) {
    container.registerInstance(TOKENS.alertService, overrides.alertService);
  } else {
    container.registerSingleton(
      TOKENS.alertService,
      (currentContainer) =>
        new AlertService(currentContainer.resolve(TOKENS.alertRepository)),
    );
  }

  if (overrides.marketDataService) {
    container.registerInstance(
      TOKENS.marketDataService,
      overrides.marketDataService,
    );
  } else {
    container.registerSingleton(
      TOKENS.marketDataService,
      (currentContainer) =>
        new MarketDataService(
          currentContainer.resolve(TOKENS.marketDataRepository),
          currentContainer.resolve(TOKENS.tickerCatalog),
          currentContainer.resolve(TOKENS.alertService),
        ),
    );
  }

  if (overrides.authController) {
    container.registerInstance(TOKENS.authController, overrides.authController);
  } else {
    container.registerSingleton(
      TOKENS.authController,
      (currentContainer) =>
        new AuthController(currentContainer.resolve(TOKENS.authService)),
    );
  }

  if (overrides.alertController) {
    container.registerInstance(
      TOKENS.alertController,
      overrides.alertController,
    );
  } else {
    container.registerSingleton(
      TOKENS.alertController,
      (currentContainer) =>
        new AlertController(
          currentContainer.resolve(TOKENS.alertService),
          currentContainer.resolve(TOKENS.marketDataService),
        ),
    );
  }

  if (overrides.tickerController) {
    container.registerInstance(
      TOKENS.tickerController,
      overrides.tickerController,
    );
  } else {
    container.registerSingleton(
      TOKENS.tickerController,
      (currentContainer) =>
        new TickerController(
          currentContainer.resolve(TOKENS.marketDataService),
        ),
    );
  }

  const tickerCatalog = container.resolve(TOKENS.tickerCatalog);
  const authService = container.resolve(TOKENS.authService);
  const alertService = container.resolve(TOKENS.alertService);
  const marketDataRepository = container.resolve(TOKENS.marketDataRepository);
  const alertRepository = container.resolve(TOKENS.alertRepository);
  const marketDataService = container.resolve(TOKENS.marketDataService);
  const authController = container.resolve(TOKENS.authController);
  const alertController = container.resolve(TOKENS.alertController);
  const tickerController = container.resolve(TOKENS.tickerController);

  return {
    container,
    tickerCatalog,
    authService,
    alertService,
    marketDataRepository,
    alertRepository,
    marketDataService,
    authController,
    alertController,
    tickerController,
  };
}
