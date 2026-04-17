import { MarketDataService } from './business/services/MarketDataService';
import { RedisMarketDataRepository } from './infrastructure/repositories/RedisMarketDataRepository';

export const marketDataRepository = new RedisMarketDataRepository();
export const marketDataService = new MarketDataService(marketDataRepository);
