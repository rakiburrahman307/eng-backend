import cron from 'node-cron';
import { Subscription } from '../app/modules/subscription/subscription.model';
import { User } from '../app/modules/user/user.model';
import { USER_ROLES } from '../enums/user';
import { logger } from './logger';
import { sendNotification } from '../helpers/notificationsHelper';
import { NOTIFICATION_TYPE } from '../app/modules/notification/notification.interface';

/**
 * Subscription Status Sync & Recovery.
 * Ensures active subscriptions with valid end dates remain 'active' in DB.
 * Status cancellation and expiration are strictly managed via Stripe Webhooks.
 */
export const scheduleSubscriptionExpirationJob = () => {
  const syncAndRestoreSubscriptions = async () => {
    try {
      const now = new Date();

      // Restore any subscriptions marked 'expired' or 'cancel' whose period has NOT ended yet
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

      if (restoredCount > 0) {
        logger.info(`[Stripe Sync] Restored ${restoredCount} valid subscriptions back to 'active'.`);
      }
    } catch (error) {
      logger.error('[Stripe Sync Error] Error during subscription sync:', error);
    }
  };

  // Run immediately on server start to recover any valid subscriptions
  syncAndRestoreSubscriptions();

  // Schedule sync check every day at midnight (00:00)
  cron.schedule('0 0 * * *', async () => {
    await syncAndRestoreSubscriptions();
  });

  logger.info('[Stripe Sync] Subscription sync initialized successfully.');
};
