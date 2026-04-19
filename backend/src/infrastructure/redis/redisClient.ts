import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

type RedisClientInstance = ReturnType<typeof createClient>;

export interface RedisConnections {
  client: RedisClientInstance;
  subscriber: RedisClientInstance;
}

const attachRedisLogging = (
  client: RedisClientInstance,
  label: string,
): RedisClientInstance => {
  client.on('error', (err) => console.error(`${label} Error`, err));
  return client;
};

export function createRedisConnections(url = REDIS_URL): RedisConnections {
  const client = attachRedisLogging(createClient({ url }), 'Redis Client');
  const subscriber = attachRedisLogging(client.duplicate(), 'Redis Subscriber');

  return { client, subscriber };
}

const defaultConnections = createRedisConnections();

export const redisClient = defaultConnections.client;
export const redisSubscriber = defaultConnections.subscriber;

export async function connectRedis(
  connections: RedisConnections = defaultConnections,
) {
  await connections.client.connect();
  await connections.subscriber.connect();
  console.log('Connected to Redis successfully');
}
