import IORedis from 'ioredis';
import colors from 'colors';
import { logger, errorLogger } from '../../shared/logger';
import config from '../../config';

// Redis connection for BullMQ
export const redisConnection = new IORedis(config.redis.url || 'redis://localhost:6379', {
     maxRetriesPerRequest: null,
     enableReadyCheck: false,
     retryStrategy: (times: number) => {
          const delay = Math.min(times * 100, 3000);
          return delay;
     },
});

// Connection events
redisConnection.on('connect', () => {
     logger.info(colors.green('✅ Redis (BullMQ) connected successfully'));
});

redisConnection.on('error', (err) => {
     errorLogger.error(colors.red('❌ Redis (BullMQ) connection error:'), err);
});

redisConnection.on('ready', () => {
     logger.info(colors.bgYellow('🚀 Redis (BullMQ) is ready'));
});
