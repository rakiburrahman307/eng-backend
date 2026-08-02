import * as admin from 'firebase-admin';
import config from '../config';

if (admin.apps.length === 0) {
     admin.initializeApp({
          credential: admin.credential.cert({
               projectId: config.firebase.projectId,
               clientEmail: config.firebase.clientEmail,
               // Replace literal \n with actual newlines to avoid parsing errors
               privateKey: config.firebase.privateKey?.replace(/\\n/g, '\n'),
          }),
     });
}

export default admin;
