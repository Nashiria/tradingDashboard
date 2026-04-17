import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

/** 
 * Summary: The default Redis connection URL fetched from environment.
 * Implementation: Constant string
 */
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

/** 
 * Summary: Persistent client instance connecting to Redis used for standard queries.
 * Service: RedisClient
 */
export const redisClient = createClient({ url: REDIS_URL });

/** 
 * Summary: Secondary client instance specific for Redis Pub/Sub operations.
 * Service: RedisSubscriberClient
 */
export const redisSubscriber = redisClient.duplicate();

redisClient.on('error', (err) => console.error('Redis Client Error', err));
redisSubscriber.on('error', (err) => console.error('Redis Subscriber Error', err));

/**
 * Summary: Establishes connections for both primary and subscriber client interfaces globally.
 * Method: connectRedis
 * @returns Void promise when connections succeed.
 */
export async function connectRedis() {
  await redisClient.connect();
  await redisSubscriber.connect();
  console.log('Connected to Redis successfully');
}
