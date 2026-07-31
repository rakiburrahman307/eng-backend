import cron from 'node-cron';
import { Subscription } from '../app/modules/subscription/subscription.model';
import { USER_ROLES } from '../enums/user';
import { logger } from './logger';
import { sendNotification } from '../helpers/notificationsHelper';
import { NOTIFICATION_TYPE } from '../app/modules/notification/notification.interface';

/**
 * Cron Job to check and expire Player subscriptions.
 * Runs daily at midnight (00:00) and checks for July 31st deadline & period expiration.
 */
export const scheduleSubscriptionExpirationJob = () => {
  const checkAndExpireSubscriptions = async () => {
    try {
      const now = new Date();

      // Find all active subscriptions
      const activeSubscriptions = await Subscription.find({ status: 'active' }).populate('user');

      let expiredCount = 0;

      for (const sub of activeSubscriptions) {
        const userObj: any = sub.user;
        if (!userObj) continue;

        // Check if user is PLAYER or TOURNAMENT_PLAYER
        const isPlayer =
          userObj.role === USER_ROLES.PLAYER ||
          userObj.role === USER_ROLES.TOURNAMENT_PLAYER;

        if (!isPlayer) continue;

        let shouldExpire = false;

        // 1. Check if currentPeriodEnd has passed
        if (sub.currentPeriodEnd) {
          const endDate = new Date(sub.currentPeriodEnd);
          if (!isNaN(endDate.getTime()) && now >= endDate) {
            shouldExpire = true;
          }
        }

        // 2. Check July 31st deadline (July is month index 6)
        const july31st = new Date(now.getFullYear(), 6, 31, 23, 59, 59);
        if (now >= july31st) {
          shouldExpire = true;
        }

        if (shouldExpire) {
          sub.status = 'expired';
          await sub.save();
          expiredCount++;

          // 🔔 Send expiration notification to player
          await sendNotification({
            receiver: userObj._id.toString(),
            title: 'Subscription Expired ⌛',
            message:
              'Your player subscription has ended/expired. Please renew your package to continue enjoying premium features.',
            type: NOTIFICATION_TYPE.GENERAL,
            metadata: { subscriptionId: sub._id },
          });
        }
      }

      if (expiredCount > 0) {
        logger.info(`[CRON] Expired ${expiredCount} player subscriptions.`);
      }
    } catch (error) {
      logger.error('[CRON Error] Error during player subscription expiration job:', error);
    }
  };

  // Run immediately on server start
  checkAndExpireSubscriptions();

  // Schedule cron job to run every day at midnight (00:00)
  cron.schedule('0 0 * * *', async () => {
    logger.info('[CRON] Running daily subscription expiration check...');
    await checkAndExpireSubscriptions();
  });

  logger.info('[CRON] Player subscription expiration cron job initialized successfully.');
};
