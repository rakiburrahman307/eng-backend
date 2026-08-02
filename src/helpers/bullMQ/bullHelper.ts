import colors from 'colors';
import { errorLogger, logger } from '../../shared/logger';
import { JobPriority, NotificationJobData } from './bullInterface';
import { JobOptionsPresets } from './bullPreset';
import { cleanupQueue, emailQueue, notificationQueue, smsQueue } from './bullQueueInstance';

// ==========================================
// EMAIL QUEUE HELPERS
// ==========================================
export class EmailQueueHelper {
     static async sendWelcomeEmail(userEmail: string, userName: string, otp: string) {
          try {
               const job = await emailQueue.add(
                    'welcome-email',
                    {
                         to: userEmail,
                         subject: 'Verify your account',
                         template: 'createAccount',
                         data: {
                              name: userName,
                              otp,
                         },
                    },
                    JobOptionsPresets.CRITICAL,
               );

               logger.info(
                    colors.green(`✉️ Welcome email queued for ${userEmail} - Job ID: ${job.id}`),
               );
               return job.id;
          } catch (error) {
               logger.error(colors.red('Failed to queue welcome email:'), error);
               throw error;
          }
     }

     static async sendPasswordResetEmail(userEmail: string, otp: string) {
          try {
               const job = await emailQueue.add(
                    'password-reset',
                    {
                         to: userEmail,
                         subject: 'Reset your password',
                         template: 'resetPassword',
                         data: { otp },
                    },
                    JobOptionsPresets.CRITICAL,
               );

               logger.info(colors.green(`🔐 Password reset email queued - Job ID: ${job.id}`));
               return job.id;
          } catch (error) {
               logger.error(colors.red('Failed to queue password reset email:'), error);
               throw error;
          }
     }

     static async sendBulkEmails(users: Array<{ email: string; name: string; data?: any }>) {
          try {
               const jobs = users.map((user) => ({
                    name: 'bulk-email',
                    data: {
                         to: user.email,
                         subject: 'Important Update',
                         template: 'update',
                         data: { name: user.name, ...user.data },
                    },
                    opts: {
                         attempts: 2,
                         priority: JobPriority.NORMAL,
                    },
               }));

               const addedJobs = await emailQueue.addBulk(jobs);
               logger.info(colors.green(`📧 ${addedJobs.length} bulk emails queued`));
               return addedJobs.map((j) => j.id);
          } catch (error) {
               logger.error(colors.red('Failed to queue bulk emails:'), error);
               throw error;
          }
     }
}

// ==========================================
// NOTIFICATION QUEUE HELPERS
// ==========================================
export class NotificationQueueHelper {
     static async sendNotification(
          userId: string,
          message: string,
          title?: string,
          type: string = 'SYSTEM',
          receiverRole?: any,
          reference?: string,
          referenceModel?: string,
     ) {
          try {
               const job = await notificationQueue.add('notification', {
                    userId,
                    title,
                    message,
                    type,
                    channels: ['in-app', 'socket', 'push'],
                    receiverRole,
                    reference,
                    referenceModel,
               });

               logger.info(
                    colors.green(`🔔 Notification queued for ${userId} - Job ID: ${job.id}`),
               );
               return job.id;
          } catch (error) {
               logger.error(colors.red('Failed to queue notification:'), error);
               throw error;
          }
     }

     static async sendBulkNotifications(
          userIds: string[],
          title: string,
          message: string,
          type: string = 'SYSTEM',
          receiverRole?: any,
          reference?: string,
          referenceModel?: string,
     ) {
          try {
               const jobs = userIds.map((userId) => ({
                    name: 'bulk-notification',
                    data: {
                         userId,
                         title,
                         message,
                         type,
                         channels: ['in-app', 'socket', 'push'] as Array<'push' | 'in-app' | 'socket'>,
                         receiverRole,
                         reference,
                         referenceModel,
                    },
               }));

               const addedJobs = await notificationQueue.addBulk(jobs);
               logger.info(colors.green(`🔔 ${addedJobs.length} notifications queued`));
               return addedJobs.map((j) => j.id);
          } catch (error) {
               logger.error(colors.red('Failed to queue bulk notifications:'), error);
               throw error;
          }
     }
}

// ==========================================
// SMS QUEUE HELPERS
// ==========================================
export class SMSQueueHelper {
     static async sendOTP(phone: string, otp: string, countryCode: string = '+880') {
          try {
               const job = await smsQueue.add(
                    'otp-sms',
                    {
                         phone,
                         message: `Your OTP is: ${otp}. Valid for 5 minutes.`,
                         countryCode,
                    },
                    JobOptionsPresets.CRITICAL,
               );

               logger.info(colors.green(`📱 OTP SMS queued for ${phone} - Job ID: ${job.id}`));
               return job.id;
          } catch (error) {
               logger.error(colors.red('Failed to queue OTP SMS:'), error);
               throw error;
          }
     }

     static async sendSMS(phone: string, message: string) {
          try {
               const job = await smsQueue.add('notification-sms', {
                    phone,
                    message,
               });

               logger.info(colors.green(`📱 SMS queued for ${phone} - Job ID: ${job.id}`));
               return job.id;
          } catch (error) {
               logger.error(colors.red('Failed to queue SMS:'), error);
               throw error;
          }
     }

     static async sendBulkSMS(recipients: Array<{ phone: string; message: string }>) {
          try {
               const jobs = recipients.map(({ phone, message }) => ({
                    name: 'bulk-sms',
                    data: { phone, message },
                    opts: { attempts: 2 },
               }));

               const addedJobs = await smsQueue.addBulk(jobs);
               logger.info(colors.green(`📱 ${addedJobs.length} SMS queued`));
               return addedJobs.map((j) => j.id);
          } catch (error) {
               logger.error(colors.red('Failed to queue bulk SMS:'), error);
               throw error;
          }
     }
}
