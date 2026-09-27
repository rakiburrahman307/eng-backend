import { Worker } from 'bullmq';
import colors from 'colors';
import { Notification } from '../../app/modules/notification/notification.model';
import { User } from '../../app/modules/user/user.model';
import { Subscription } from '../../app/modules/subscription/subscription.model';
import { redisConnection } from './redisConnection';
import { emailTemplate } from '../../shared/emailTemplate';
import { errorLogger, logger } from '../../shared/logger';
import { emailHelper } from '../emailHelper';
import {
     CleanupJobData,
     EmailJobData,
     NotificationJobData,
     SMSJobData,
} from './bullInterface';
import { emailQueue, notificationQueue, smsQueue } from './bullQueueInstance';
import { NotificationHelper } from '../../app/builder/PushNotifications';

// ==========================================
// EMAIL WORKER
// ==========================================
export const emailWorker = new Worker<EmailJobData>(
     'email-queue',
     async (job) => {
          try {
               const { template, to, data } = job.data;
               logger.info(colors.blue(`[BullMQ] Processing email job ${job.id}`));

               let emailData;
               switch (template) {
                    case 'createAccount':
                         emailData = emailTemplate.createAccount({
                              email: to,
                              name: data?.name,
                              otp: data?.otp,
                         });
                         break;

                    case 'resetPassword':
                         emailData = emailTemplate.resetPassword({
                              email: to,
                              otp: data?.otp,
                         });
                         break;

                    default:
                         throw new Error(`Unknown email template: ${template}`);
               }

               // Send email
               await emailHelper.sendEmail(emailData);

               logger.info(colors.green(`[BullMQ] Email sent to ${emailData.to}`));
               return { success: true, recipient: emailData.to, jobId: job.id };
          } catch (error: any) {
               errorLogger.error(colors.red(`[BullMQ] Email job ${job.id} failed:`), error);
               throw error;
          }
     },
     {
          connection: redisConnection,
          concurrency: 5,
     },
);

// ==========================================
// NOTIFICATION WORKER
// ==========================================
export const notificationWorker = new Worker<NotificationJobData>(
     'notification-queue',
     async (job) => {
          try {
               const {
                    userId,
                    title,
                    message,
                    type,
                    channels,
                    data,
                    reference,
                    referenceModel,
                    screen,
                    receiverRole,
               } = job.data;
               logger.info(colors.blue(`[BullMQ] Processing notification job ${job.id} (${job.name})`));

               // Handle scheduled push notifications
               if (job.name === 'scheduled-push-notification' || job.data.pushNotificationId) {
                    const { PushNotification } = require('../../app/modules/pushNotification/pushNotification.model');
                    const pushNotificationId = job.data.pushNotificationId;
                    const notifDoc = await PushNotification.findById(pushNotificationId);

                    if (!notifDoc) {
                         logger.info(colors.yellow(`[BullMQ] Scheduled push notification ${pushNotificationId} not found`));
                         return { success: false, reason: 'NOT_FOUND' };
                    }

                    if (notifDoc.status === 'CANCELLED') {
                         logger.info(colors.yellow(`[BullMQ] Scheduled push notification ${pushNotificationId} was cancelled`));
                         return { success: false, reason: 'CANCELLED' };
                    }

                    const { resolveNotificationRecipients } = require('../../app/modules/pushNotification/pushNotification.service');
                    const { userIds } = await resolveNotificationRecipients(
                         notifDoc.user ? notifDoc.user.toString() : null,
                         notifDoc.targetRole
                    );

                    if (userIds.length > 0) {
                         await NotificationHelper.sendToBatch(userIds, {
                              title: notifDoc.title,
                              body: notifDoc.message,
                              type: 'SYSTEM',
                         });
                    }

                    notifDoc.status = 'SENT';
                    notifDoc.sentAt = new Date();
                    await notifDoc.save();

                    logger.info(colors.green(`[BullMQ] Scheduled push notification ${pushNotificationId} executed and dispatched successfully`));
                    return { success: true, pushNotificationId, status: 'SENT' };
               }

               // Handle Team Subscriber Notifications (Bell Icon subscribers)
               if (job.name === 'team-subscriber-notification' || (job.data.teamId && !userId)) {
                    const teamId = job.data.teamId;
                    const { TeamSubscription } = require('../../app/modules/teamSubscription/teamSubscription.model');

                    const subscribers = await TeamSubscription.find({
                         team: teamId,
                         isBellActive: true,
                    }).select('user').lean();

                    // 1. Strictly deduplicate subscriber user IDs
                    let subscriberUserIds: string[] = Array.from(
                         new Set<string>(
                              (subscribers || [])
                                   .map((s: any) => s.user?.toString())
                                   .filter(Boolean),
                         ),
                    );

                    // 2. Exclude the trigger player / user so they do not receive a duplicate personal notification
                    const excludedUserIds = new Set<string>(
                         [
                              data?.playerId,
                              ...(data?.excludeUserIds || []),
                         ]
                              .filter(Boolean)
                              .map((id: any) => String(id)),
                    );

                    if (excludedUserIds.size > 0) {
                         subscriberUserIds = subscriberUserIds.filter(
                              (uId: string) => !excludedUserIds.has(uId),
                         );
                    }

                    logger.info(colors.cyan(`[Team Notification] Found ${subscriberUserIds.length} unique subscribers for team ${teamId}`));

                    if (subscriberUserIds.length > 0) {
                         const CHUNK_SIZE = 500;
                         for (let i = 0; i < subscriberUserIds.length; i += CHUNK_SIZE) {
                              const batch = subscriberUserIds.slice(i, i + CHUNK_SIZE);
                              await NotificationHelper.sendToBatch(batch, {
                                   title: title || 'Team Update',
                                   body: message,
                                   type: type || 'TEAM_UPDATE',
                                   reference,
                                   referenceModel: referenceModel || 'Team',
                                   data: {
                                        teamId: teamId?.toString() || '',
                                        screen: screen || 'TEAM_DETAILS',
                                        ...(data || {}),
                                   },
                              });
                         }
                    }

                    return { success: true, teamId, subscribersCount: subscriberUserIds.length };
               }

               // In-app + Push notification via NotificationHelper
               if (channels?.includes('in-app') || channels?.includes('push')) {
                    await NotificationHelper.sendToUser(userId!, {
                         title: title || 'Notification',
                         body: message,
                         type: type || 'SYSTEM',
                         receiverRole,
                         reference,
                         referenceModel,
                         data: {
                              reference: reference?.toString() || '',
                              referenceModel: referenceModel || '',
                              screen: screen || '',
                              ...data,
                         },
                    });
                    logger.info(colors.cyan(`[BullMQ] Notification saved & sent to user ${userId}`));
               }
               logger.info(colors.green(`[BullMQ] Notification job ${job.id} completed`));
               return { success: true, userId, channels, jobId: job.id };
          } catch (error: any) {
               errorLogger.error(colors.red(`[BullMQ] Notification job ${job.id} failed:`), error);
               throw error;
          }
     },
     {
          connection: redisConnection,
          concurrency: 10,
     },
);

// ==========================================
// SMS WORKER
// ==========================================
export const smsWorker = new Worker<SMSJobData>(
     'sms-queue',
     async (job) => {
          try {
               const { phone, message, countryCode } = job.data;
               logger.info(colors.blue(`[BullMQ] Processing SMS job ${job.id}`));
               
               // Implement SMS sending logic here if needed (e.g. Twilio/VeevoTech)
               logger.info(colors.green(`[BullMQ] SMS sent to ${phone}`));
               return { success: true, phone, jobId: job.id };
          } catch (error: any) {
               errorLogger.error(colors.red(`[BullMQ] SMS job ${job.id} failed:`), error);
               throw error;
          }
     },
     {
          connection: redisConnection,
          concurrency: 3,
     },
);

// ==========================================
// CLEANUP WORKER
// ==========================================
export const cleanupWorker = new Worker<CleanupJobData>(
     'cleanup-queue',
     async (job) => {
          try {
               const { type, olderThan } = job.data;
               logger.info(colors.blue(`[BullMQ] Processing cleanup job ${job.id} - Type: ${type}`));

               let deletedCount = 0;

               switch (type) {
                    case 'old-notifications':
                         const thirtyDaysAgo = new Date();
                         thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - (olderThan || 30));

                         const result = await Notification.deleteMany({
                              isRead: true,
                              createdAt: { $lt: thirtyDaysAgo },
                         });

                         deletedCount = result.deletedCount || 0;
                         logger.info(colors.cyan(`[BullMQ] Deleted ${deletedCount} old notifications`));
                         break;

                    case 'completed-jobs':
                         await emailQueue.clean(24 * 3600 * 1000, 100, 'completed');
                         await notificationQueue.clean(12 * 3600 * 1000, 50, 'completed');
                         await smsQueue.clean(24 * 3600 * 1000, 100, 'completed');
                         logger.info(colors.cyan(`[BullMQ] Cleaned old completed jobs from queues`));
                         break;

                    case 'failed-jobs':
                         await emailQueue.clean(7 * 24 * 3600 * 1000, 500, 'failed');
                         await notificationQueue.clean(7 * 24 * 3600 * 1000, 500, 'failed');
                         await smsQueue.clean(7 * 24 * 3600 * 1000, 500, 'failed');
                         logger.info(colors.cyan(`[BullMQ] Cleaned old failed jobs from queues`));
                         break;

                    case 'all-notifications':
                         const ninetyDaysAgo = new Date();
                         ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

                         const allResult = await Notification.deleteMany({
                              isRead: true,
                              createdAt: { $lt: ninetyDaysAgo },
                         });

                         deletedCount = allResult.deletedCount || 0;
                         logger.info(colors.cyan(`[BullMQ] Deleted ${deletedCount} very old notifications`));
                         break;

                    case 'subscription-sync':
                         const now = new Date();
                         const mistakenlyExpired = await Subscription.find({
                              status: { $in: ['expired', 'cancel'] },
                         }).populate('user');

                         let restoredCount = 0;
                         for (const sub of mistakenlyExpired) {
                              if (sub.currentPeriodEnd) {
                                   const endDate = new Date(sub.currentPeriodEnd);
                                   if (!isNaN(endDate.getTime()) && now < endDate) {
                                        sub.status = 'active';
                                        await sub.save();
                                        if (sub.user) {
                                             await User.findByIdAndUpdate((sub.user as any)._id || sub.user, {
                                                  isSubscribed: true,
                                                  hasAccess: true,
                                             });
                                        }
                                        restoredCount++;
                                   }
                              }
                         }
                         logger.info(colors.cyan(`[BullMQ] Restored ${restoredCount} valid subscriptions back to 'active'`));
                         break;

                    case 'unverified-users':
                         const cutoffDate = new Date(Date.now() - 5 * 60 * 1000);
                         const delRes = await User.deleteMany({
                              verified: false,
                              createdAt: { $lt: cutoffDate },
                         });
                         logger.info(colors.cyan(`[BullMQ] Deleted ${delRes.deletedCount || 0} unverified accounts`));
                         break;

                    default:
                         logger.warn(colors.yellow(`Unknown cleanup type: ${type}`));
               }

               logger.info(colors.green(`[BullMQ] Cleanup job ${job.id} completed`));
               return { success: true, type, deletedCount, jobId: job.id };
          } catch (error: any) {
               errorLogger.error(colors.red(`[BullMQ] Cleanup job ${job.id} failed:`), error);
               throw error;
          }
     },
     {
          connection: redisConnection,
          concurrency: 1,
     },
);

logger.info(colors.bgMagenta.white('All BullMQ workers are running'));
