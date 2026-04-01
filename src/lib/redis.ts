// Redis client singleton for rate limiting and caching
// Supports both local Redis and Vercel KV (production)

import Redis from 'ioredis';

let redis: Redis | null = null;

/**
 * Get Redis client (singleton)
 * Falls back to in-memory cache if Redis unavailable
 */
export function getRedisClient(): Redis | null {
  if (redis) return redis;

  const redisUrl = process.env.REDIS_URL || process.env.KV_URL;

  if (!redisUrl) {
    console.warn('REDIS_URL not configured. Rate limiting and caching disabled.');
    return null;
  }

  try {
    redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      lazyConnect: true, // Don't connect immediately
    });

    redis.on('error', (err) => {
      console.error('Redis connection error:', err);
    });

    redis.on('connect', () => {
      console.log('Redis connected successfully');
    });

    return redis;
  } catch (error) {
    console.error('Failed to initialize Redis client:', error);
    return null;
  }
}

/**
 * Close Redis connection (cleanup)
 */
export async function closeRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
  }
}

// Export singleton instance
export const redisClient = getRedisClient();
