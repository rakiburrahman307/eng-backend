import { JobsOptions } from 'bullmq';
import { JobPriority } from './bullInterface';

export const JobOptionsPresets: Record<string, Partial<JobsOptions>> = {
     // Critical - High priority, many retries
     CRITICAL: {
          priority: JobPriority.CRITICAL,
          attempts: 5,
          backoff: {
               type: 'exponential',
               delay: 1000,
          },
          removeOnComplete: false,
          removeOnFail: false,
     },

     // High priority - Important but not critical
     HIGH_PRIORITY: {
          priority: JobPriority.HIGH,
          attempts: 3,
          backoff: {
               type: 'exponential',
               delay: 2000,
          },
          removeOnComplete: {
               count: 100,
               age: 24 * 3600,
          },
     },

     // Normal - Standard processing
     NORMAL: {
          priority: JobPriority.NORMAL,
          attempts: 2,
          backoff: {
               type: 'fixed',
               delay: 5000,
          },
          removeOnComplete: {
               count: 50,
               age: 12 * 3600,
          },
     },

     // Low priority - Can wait
     LOW_PRIORITY: {
          priority: JobPriority.LOW,
          attempts: 1,
          removeOnComplete: true,
     },

     // Scheduled - For cron jobs
     SCHEDULED: {
          removeOnComplete: {
               count: 10,
               age: 24 * 3600,
          },
          removeOnFail: {
               count: 50,
          },
     },

     // One-time - No retries
     ONE_TIME: {
          attempts: 1,
          removeOnComplete: true,
          removeOnFail: false,
     },
};
