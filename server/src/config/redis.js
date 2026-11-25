/**
 * Redis Client (Upstash) with Graceful In-Memory Fallback
 *
 * Used for:
 * 1. Report caching (burndown, velocity, workload) with short TTL & invalidation
 * 2. Socket.io Redis Adapter for horizontal scaling across multiple server instances
 *
 * If REDIS_URL is omitted in local development, falls back gracefully to an in-memory Map.
 */

const Redis = require('ioredis');
const env = require('./env');

let redisClient = null;
const memoryCache = new Map();

const createRedisClient = (label = 'cache') => {
  if (!env.REDIS_URL) return null;

  const client = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: false,
    tls: env.REDIS_URL.startsWith('rediss://') ? { rejectUnauthorized: false } : undefined
  });

  client.on('error', (err) => {
    console.warn(`[Redis:${label}] Connection warning: ${err.message}`);
  });

  client.on('connect', () => {
    console.log(`⚡ [Redis:${label}] Connected`);
  });

  return client;
};

const getRedisClient = () => {
  if (!env.REDIS_URL) return null;
  if (!redisClient) {
    redisClient = createRedisClient('main');
  }
  return redisClient;
};

const getCache = async (key) => {
  const client = getRedisClient();
  if (client && client.status === 'ready') {
    try {
      const val = await client.get(key);
      return val ? JSON.parse(val) : null;
    } catch {
      // Fall through to memory cache on transient error
    }
  }

  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    memoryCache.delete(key);
    return null;
  }
  return entry.value;
};

const setCache = async (key, value, ttlSeconds = 60) => {
  const client = getRedisClient();
  if (client && client.status === 'ready') {
    try {
      await client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
      return;
    } catch {
      // Fall through
    }
  }

  memoryCache.set(key, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000
  });
};

const invalidateWorkspaceReports = async (workspaceId) => {
  if (!workspaceId) return;
  const prefix = `reports:${workspaceId.toString()}:`;

  for (const key of memoryCache.keys()) {
    if (key.startsWith(prefix)) {
      memoryCache.delete(key);
    }
  }

  const client = getRedisClient();
  if (client && client.status === 'ready') {
    try {
      const keys = await client.keys(`${prefix}*`);
      if (keys.length > 0) {
        await client.del(...keys);
      }
    } catch {
      // Ignore cache invalidation errors
    }
  }
};

module.exports = {
  createRedisClient,
  getRedisClient,
  getCache,
  setCache,
  invalidateWorkspaceReports
};
