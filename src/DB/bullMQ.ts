import { QueueEvents } from 'bullmq';
import colors from 'colors';
import { logger, errorLogger } from '../shared/logger';
import {
     cleanupQueue,
     emailQueue,
     notificationQueue,
     smsQueue,
} from '../helpers/bullMQ/bullQueueInstance';
import { redisConnection } from '../helpers/bullMQ/redisConnection';

export { redisConnection };

// ==========================================
// QUEUE EVENTS FOR MONITORING
// ==========================================
const emailQueueEvents = new QueueEvents('email-queue', { connection: redisConnection });
const notificationQueueEvents = new QueueEvents('notification-queue', {
     connection: redisConnection,
});
const smsQueueEvents = new QueueEvents('sms-queue', { connection: redisConnection });
const cleanupQueueEvents = new QueueEvents('cleanup-queue', { connection: redisConnection });

// ==========================================
// SETUP QUEUE EVENTS
// ==========================================
export function setupQueueEvents(): void {
     // Email Queue Events
     emailQueueEvents.on('completed', ({ jobId }) => {
          logger.info(colors.green(`✅ Email job ${jobId} completed`));
     });
     emailQueueEvents.on('failed', ({ jobId, failedReason }) => {
          errorLogger.error(colors.red(`❌ Email job ${jobId} failed: ${failedReason}`));
     });

     // Notification Queue Events
     notificationQueueEvents.on('completed', ({ jobId }) => {
          logger.info(colors.green(`✅ Notification job ${jobId} completed`));
     });
     notificationQueueEvents.on('failed', ({ jobId, failedReason }) => {
          errorLogger.error(colors.red(`❌ Notification job ${jobId} failed: ${failedReason}`));
     });

     // SMS Queue Events
     smsQueueEvents.on('completed', ({ jobId }) => {
          logger.info(colors.green(`✅ SMS job ${jobId} completed`));
     });
     smsQueueEvents.on('failed', ({ jobId, failedReason }) => {
          errorLogger.error(colors.red(`❌ SMS job ${jobId} failed: ${failedReason}`));
     });

     // Cleanup Queue Events
     cleanupQueueEvents.on('completed', ({ jobId }) => {
          logger.info(colors.green(`✅ Cleanup job ${jobId} completed`));
     });
     cleanupQueueEvents.on('failed', ({ jobId, failedReason }) => {
          errorLogger.error(colors.red(`❌ Cleanup job ${jobId} failed: ${failedReason}`));
     });

     logger.info(colors.bgBlue.white('📊 BullMQ queue events initialized for all queues'));
}

// ==========================================
// SETUP WORKER EVENTS (call this from server.ts)
// ==========================================
export function setupWorkerEvents(): void {
     const {
          emailWorker,
          notificationWorker,
          smsWorker,
          cleanupWorker,
     } = require('../helpers/bullMQ/bullWorkers');

     emailWorker.on('completed', (job: any) => {
          logger.info(colors.green(`✅ Email worker job ${job.id} completed`));
     });

     emailWorker.on('failed', (job: any, err: any) => {
          errorLogger.error(colors.red(`❌ Email worker job ${job?.id} failed: ${err.message}`));
     });

     notificationWorker.on('completed', (job: any) => {
          logger.info(colors.green(`✅ Notification worker job ${job.id} completed`));
     });

     notificationWorker.on('failed', (job: any, err: any) => {
          errorLogger.error(
               colors.red(`❌ Notification worker job ${job?.id} failed: ${err.message}`),
          );
     });

     smsWorker.on('completed', (job: any) => {
          logger.info(colors.green(`✅ SMS worker job ${job.id} completed`));
     });

     smsWorker.on('failed', (job: any, err: any) => {
          errorLogger.error(colors.red(`❌ SMS worker job ${job?.id} failed: ${err.message}`));
     });

     cleanupWorker.on('completed', (job: any) => {
          logger.info(colors.green(`✅ Cleanup worker job ${job.id} completed`));
     });

     cleanupWorker.on('failed', (job: any, err: any) => {
          errorLogger.error(colors.red(`❌ Cleanup worker job ${job?.id} failed: ${err.message}`));
     });

     logger.info(colors.bgMagenta.white('🚀 All BullMQ worker events initialized'));
}

export function getAllQueues() {
     return {
          email: emailQueue,
          notification: notificationQueue,
          sms: smsQueue,
          cleanup: cleanupQueue,
     };
}

export async function getQueueStats(queueName: string) {
     const queues = getAllQueues();
     const queue = queues[queueName as keyof typeof queues];

     if (!queue) {
          throw new Error(`Queue ${queueName} not found`);
     }

     const [waiting, active, completed, failed, delayed, paused] = await Promise.all([
          queue.getWaitingCount(),
          queue.getActiveCount(),
          queue.getCompletedCount(),
          queue.getFailedCount(),
          queue.getDelayedCount(),
          queue.isPaused(),
     ]);

     return {
          name: queueName,
          waiting,
          active,
          completed,
          failed,
          delayed,
          paused,
          total: waiting + active + delayed,
     };
}

// Get all queues stats
export async function getAllQueuesStats() {
     const queueNames = Object.keys(getAllQueues());
     const stats = await Promise.all(queueNames.map((name) => getQueueStats(name)));

     return stats;
}

// ==========================================
// GRACEFUL SHUTDOWN
// ==========================================
export async function closeBullMQ(): Promise<void> {
     try {
          logger.info(colors.yellow('⏳ Closing BullMQ queues...'));

          const {
               emailWorker,
               notificationWorker,
               smsWorker,
               cleanupWorker,
          } = require('../helpers/bullMQ/bullWorkers');

          await Promise.all([
               emailQueue.close(),
               notificationQueue.close(),
               smsQueue.close(),
               cleanupQueue.close(),
               emailQueueEvents.close(),
               notificationQueueEvents.close(),
               smsQueueEvents.close(),
               cleanupQueueEvents.close(),
               emailWorker.close(),
               notificationWorker.close(),
               smsWorker.close(),
               cleanupWorker.close(),
          ]);

          await redisConnection.quit();

          logger.info(colors.green('✅ All BullMQ queues closed'));
     } catch (error) {
          errorLogger.error(colors.red('Error closing BullMQ:'), error);
          throw error;
     }
}
