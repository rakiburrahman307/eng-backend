import colors from 'colors';
import mongoose from 'mongoose';
import firebaseAdmin from '../../firebase/firebase';
import { sendNotification } from '../../helpers/notificationsHelper';
import { logger } from '../../shared/logger';
import { User } from '../modules/user/user.model';
import { NOTIFICATION_TYPE } from '../modules/notification/notification.interface';

export interface INotificationPayload {
     title: string;
     body: string;
     type?: string;
     data?: Record<string, string>;
     receiverRole?: string;
     reference?: string;
     referenceModel?: string;
}

export class NotificationHelper {
     // SEND TO SINGLE USER
     static async sendToUser(
          userId: string | mongoose.Types.ObjectId,
          payload: INotificationPayload,
     ) {
          return this.sendToBatch([userId], payload);
     }

     // SEND TO MULTIPLE USERS (BATCH)
     static async sendToBatch(
          userIds: (string | mongoose.Types.ObjectId)[],
          payload: INotificationPayload,
     ) {
          try {
               if (!userIds.length) return;

               // 1. Filter Users and get FCM Tokens
               const validUsers = await User.find({
                    _id: { $in: userIds },
               })
                    .select('_id fcmToken')
                    .lean();

               const validUserIds = validUsers.map((u) => u._id);
               if (validUserIds.length === 0) return;

               const fcmTokens = [
                    ...new Set(validUsers.map((u) => u.fcmToken?.trim()).filter(Boolean)),
               ] as string[];

               const tasks = [];

               // A. Send Push (if tokens exist & Firebase Admin is initialized)
               if (fcmTokens.length > 0 && firebaseAdmin) {
                    tasks.push(this.sendToFCM(fcmTokens, payload));
               }

               // B. Save to Database (always)
               tasks.push(this.saveToDatabase(validUserIds, payload));

               await Promise.allSettled(tasks);
               logger.info(
                    colors.green(
                         `✅ Notification flow completed for ${validUserIds.length} users.`,
                    ),
               );
          } catch (error) {
               logger.error(colors.red('❌ NotificationHelper Error:'), error);
          }
     }

     // FCM Send
     private static async sendToFCM(tokens: string[], payload: INotificationPayload) {
          try {
               if (!firebaseAdmin) return;
               tokens = [...new Set(tokens)];
               if (!tokens.length) return;

               const message: any = {
                    tokens: tokens,
                    notification: {
                         title: payload.title,
                         body: payload.body,
                    },
                    data: payload.data || {},
                    android: {
                         priority: 'high',
                         notification: {
                              channelId: 'default_channel',
                              priority: 'high',
                              sound: 'default',
                              defaultSound: true,
                              defaultVibrateTimings: true,
                              defaultLightSettings: true,
                         },
                    },
                    apns: {
                         payload: {
                              aps: {
                                   sound: 'default',
                                   badge: 1,
                                   contentAvailable: true,
                              },
                         },
                         headers: {
                              'apns-priority': '10',
                         },
                    },
               };

               const response = await firebaseAdmin.messaging().sendEachForMulticast(message);

               // Clean up failed/expired tokens if failureCount > 0
               if (response.failureCount > 0) {
                    const failedTokens: string[] = [];
                    response.responses.forEach((resp: any, idx: number) => {
                         if (!resp.success) {
                              const errCode = resp.error?.code;
                              if (
                                   errCode === 'messaging/registration-token-not-registered' ||
                                   errCode === 'messaging/invalid-registration-token' ||
                                   errCode === 'messaging/mismatched-credential'
                              ) {
                                   failedTokens.push(tokens[idx]);
                              }
                         }
                    });
                    if (failedTokens.length > 0) {
                         await User.updateMany(
                              { fcmToken: { $in: failedTokens } },
                              { $set: { fcmToken: null } }
                         );
                         logger.info(
                              colors.yellow(
                                   `🗑️ Removed ${failedTokens.length} invalid FCM tokens from users`,
                              ),
                         );
                    }
               }

               logger.info(
                    colors.green(
                         `📱 FCM sent: ${response.successCount} success, ${response.failureCount} failed out of ${tokens.length} tokens`,
                    ),
               );
          } catch (error) {
               logger.error(colors.red('FCM Send Error:'), error);
          }
     }

     // Save to Database and Socket emission
     private static async saveToDatabase(
          userIds: (string | mongoose.Types.ObjectId)[],
          payload: INotificationPayload,
     ) {
          try {
               let mappedType: NOTIFICATION_TYPE = NOTIFICATION_TYPE.GENERAL;
               if (payload.type && Object.values(NOTIFICATION_TYPE).includes(payload.type as NOTIFICATION_TYPE)) {
                    mappedType = payload.type as NOTIFICATION_TYPE;
               }

               const notificationTasks = userIds.map((userId) => {
                    const notificationData = {
                         receiver: userId.toString(),
                         title: payload.title,
                         message: payload.body,
                         type: mappedType,
                         metadata: {
                              reference: payload.reference || null,
                              referenceModel: payload.referenceModel || null,
                              ...payload.data,
                         },
                    };

                    return sendNotification(notificationData);
               });

               await Promise.all(notificationTasks);

               logger.info(
                    colors.cyan(
                         `💾 & 📡 Processed ${userIds.length} notifications via sendNotification.`,
                    ),
               );
          } catch (error) {
               logger.error(colors.red('❌ NotificationHelper saveToDatabase Error:'), error);
          }
     }
}
