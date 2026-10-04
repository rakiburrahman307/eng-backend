import os from 'os';
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiErrors';
import { getAllQueues, getAllQueuesStats, redisConnection } from '../../../DB/bullMQ';

const formatBytes = (bytes: number) => {
     return {
          bytes,
          GB: +(bytes / 1024 / 1024 / 1024).toFixed(2),
          MB: +(bytes / 1024 / 1024).toFixed(0),
     };
};

const formatUptime = (seconds: number) => {
     const days = Math.floor(seconds / 86400);
     seconds %= 86400;
     const hours = Math.floor(seconds / 3600);
     seconds %= 3600;
     const minutes = Math.floor(seconds / 60);
     return { days, hours, minutes };
};

const serverHealth = async () => {
     const totalMemory = os.totalmem();
     const freeMemory = os.freemem();
     const usedMemory = totalMemory - freeMemory;
     const usedMemoryPercentage = +((usedMemory / totalMemory) * 100).toFixed(2);

     const status =
          usedMemoryPercentage < 60 ? 'healthy' : usedMemoryPercentage < 85 ? 'moderate' : 'critical';

     return {
          status,
          database: {
               status: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
               readyState: mongoose.connection.readyState,
          },
          cpuCores: os.cpus().length,
          loadAverage: {
               '1min': os.loadavg()[0],
               '5min': os.loadavg()[1],
               '15min': os.loadavg()[2],
          },
          memory: {
               totalMemory: formatBytes(totalMemory),
               freeMemory: formatBytes(freeMemory),
               usedMemory: formatBytes(usedMemory),
               usedMemoryPercentage,
          },
          uptime: formatUptime(os.uptime()),
          timestamp: new Date().toISOString(),
     };
};

const getServerLogs = async (type: 'success' | 'error' = 'success', limit: number = 100) => {
     const logDir = path.join(process.cwd(), 'winston', type);
     if (!fs.existsSync(logDir)) {
          return { fileName: '', logs: [] };
     }

     const files = fs
          .readdirSync(logDir)
          .filter((f) => f.endsWith('.log'))
          .sort((a, b) => {
               const statA = fs.statSync(path.join(logDir, a));
               const statB = fs.statSync(path.join(logDir, b));
               return statB.mtime.getTime() - statA.mtime.getTime();
          });

     if (files.length === 0) {
          return { fileName: '', logs: [] };
     }

     const latestFile = files[0];
     const filePath = path.join(logDir, latestFile);
     const content = fs.readFileSync(filePath, 'utf-8');
     const lines = content
          .split(/\r?\n/)
          .filter((line) => line.trim().length > 0);

     const logs = lines.slice(-limit);

     return {
          fileName: latestFile,
          logs,
     };
};

const getQueueAndCacheStatus = async () => {
     const redisInfo = {
          connected: false,
          pingMs: 0,
          usedMemoryHuman: '0M',
          usedMemoryBytes: 0,
          totalKeys: 0,
          appCacheKeys: 0,
          bullKeys: 0,
          uptimeSeconds: 0,
          version: 'Unknown',
     };

     try {
          const startTime = Date.now();
          const pong = await redisConnection.ping();
          const pingMs = Date.now() - startTime;

          if (pong === 'PONG') {
               redisInfo.connected = true;
               redisInfo.pingMs = pingMs;

               const infoStr = await redisConnection.info();
               const memMatch = infoStr.match(/used_memory_human:([^\r\n]+)/);
               if (memMatch) redisInfo.usedMemoryHuman = memMatch[1].trim();

               const bytesMatch = infoStr.match(/used_memory:([^\r\n]+)/);
               if (bytesMatch) redisInfo.usedMemoryBytes = parseInt(bytesMatch[1].trim(), 10) || 0;

               const upMatch = infoStr.match(/uptime_in_seconds:([^\r\n]+)/);
               if (upMatch) redisInfo.uptimeSeconds = parseInt(upMatch[1].trim(), 10) || 0;

               const verMatch = infoStr.match(/redis_version:([^\r\n]+)/);
               if (verMatch) redisInfo.version = verMatch[1].trim();

               const allKeys = await redisConnection.keys('*');
               redisInfo.totalKeys = allKeys.length;
               redisInfo.bullKeys = allKeys.filter(
                    (k) => k.startsWith('bull:') || k.startsWith('eng-')
               ).length;
               redisInfo.appCacheKeys = Math.max(0, redisInfo.totalKeys - redisInfo.bullKeys);
          }
     } catch (err: any) {
          redisInfo.connected = false;
     }

     let queues: any[] = [];
     try {
          queues = await getAllQueuesStats();
     } catch (err: any) {
          queues = [];
     }

     return {
          redis: redisInfo,
          queues,
          timestamp: new Date().toISOString(),
     };
};

const executeQueueAction = async (
     queueName: string,
     action: 'retry-failed' | 'clean-completed' | 'clean-failed' | 'pause' | 'resume'
) => {
     const queueMap = getAllQueues();
     const targets: { name: string; queue: any }[] = [];

     if (queueName === 'all') {
          Object.entries(queueMap).forEach(([name, queue]) => targets.push({ name, queue }));
     } else {
          const queue = (queueMap as any)[queueName];
          if (!queue) {
               throw new ApiError(StatusCodes.BAD_REQUEST, `Queue '${queueName}' not found`);
          }
          targets.push({ name: queueName, queue });
     }

     const results: Record<string, any> = {};

     for (const { name, queue } of targets) {
          switch (action) {
               case 'retry-failed': {
                    const failedJobs = await queue.getFailed(0, 1000);
                    let retried = 0;
                    for (const job of failedJobs) {
                         await job.retry();
                         retried++;
                    }
                    results[name] = { retried };
                    break;
               }
               case 'clean-completed': {
                    const cleaned = await queue.clean(0, 5000, 'completed');
                    results[name] = { cleaned: cleaned.length };
                    break;
               }
               case 'clean-failed': {
                    const cleaned = await queue.clean(0, 5000, 'failed');
                    results[name] = { cleaned: cleaned.length };
                    break;
               }
               case 'pause': {
                    await queue.pause();
                    results[name] = { paused: true };
                    break;
               }
               case 'resume': {
                    await queue.resume();
                    results[name] = { resumed: true };
                    break;
               }
               default:
                    throw new ApiError(StatusCodes.BAD_REQUEST, `Invalid queue action: ${action}`);
          }
     }

     return {
          queueName,
          action,
          results,
          message: `Successfully executed '${action}' on ${queueName === 'all' ? 'all queues' : queueName + ' queue'}.`,
     };
};

const flushCache = async (type: 'cache-only' | 'all') => {
     if (type === 'cache-only') {
          const allKeys = await redisConnection.keys('*');
          const cacheKeys = allKeys.filter(
               (k) => !k.startsWith('bull:') && !k.startsWith('eng-') && !k.startsWith('socket.io')
          );

          let deletedCount = 0;
          if (cacheKeys.length > 0) {
               for (let i = 0; i < cacheKeys.length; i += 500) {
                    const batch = cacheKeys.slice(i, i + 500);
                    deletedCount += await redisConnection.del(...batch);
               }
          }

          return {
               type,
               deletedCount,
               totalScanned: allKeys.length,
               message: `Successfully flushed ${deletedCount} application cache keys. BullMQ queues and sockets remain intact.`,
          };
     } else if (type === 'all') {
          await redisConnection.flushdb();
          return {
               type,
               message: 'All keys in the Redis database have been completely flushed.',
          };
     } else {
          throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid flush type. Must be "cache-only" or "all".');
     }
};

export const ServerHealthServices = {
     serverHealth,
     getServerLogs,
     getQueueAndCacheStatus,
     executeQueueAction,
     flushCache,
};
