import admin from 'firebase-admin';
import serviceAccount from "../../src/firebaseSDK.json";
import { logger } from '../shared/logger';

// Cast serviceAccount to ServiceAccount type
const serviceAccountKey: admin.ServiceAccount = serviceAccount as admin.ServiceAccount;

// Initialize Firebase SDK
admin.initializeApp({
    credential: admin.credential.cert(serviceAccountKey),
});


//multiple user
const sendPushNotifications = async (
    values: admin.messaging.MulticastMessage) => {
    const res = await admin.messaging().sendEachForMulticast(values);
    logger.info('Notifications sent successfully', res);
};

//single user
const sendPushNotification = async (values: admin.messaging.Message) => {
    const res = await admin.messaging().send(values);
    logger.info('Notification sent successfully', res);
};

export const firebaseHelper = {
    sendPushNotifications,
    sendPushNotification,
};

/* const message = {
    notification: {
      title: `${payload.offerTitle}`,
      body: `A new offer is available for you`,
    },
    tokens: users
      .map(user => user.deviceToken)
      .filter((token): token is string => !!token),
  };

  //firebase
  firebaseHelper.sendPushNotifications(message); */


// for setup the firebase notification an attribute set on the user model which name will be deviceToken
// and when login it will be save on the database. then when you need to send the push notification call above function