import { createClient } from 'redis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
export const redisCacheClient = createClient({ url: redisUrl });

redisCacheClient.on('error', (err) => console.warn('Redis Cache Error:', err));

// Connect gracefully
(async () => {
  try {
    await redisCacheClient.connect();
  } catch (err) {
    console.warn('Failed to connect to Redis cache initially', err);
  }
})();

export async function getCachedData(key: string) {
  try {
    if (!redisCacheClient.isOpen) return null;
    const data = await redisCacheClient.get(key);
    return data ? JSON.parse(data) : null;
  } catch (err) {
    return null;
  }
}

export async function setCachedData(key: string, data: any, ttlSeconds: number = 60) {
  try {
    if (redisCacheClient.isOpen) {
      await redisCacheClient.setEx(key, ttlSeconds, JSON.stringify(data));
    }
  } catch (err) {}
}
