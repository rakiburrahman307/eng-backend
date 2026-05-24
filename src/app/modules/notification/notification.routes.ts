import express from 'express';
import auth from '../../middlewares/auth';
import { USER_ROLES } from '../../../enums/user';
import { NotificationController } from './notification.controller';


const router = express.Router();

// SEND TO ALL USERS
router.post(
  '/send-all',
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  NotificationController.sendToAllUsers
);

// GET ALL NOTIFICATIONS (ADMIN)
router.get(
  '/',
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  NotificationController.getAllNotifications
);

// DELETE NOTIFICATION
router.delete(
  '/:id',
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  NotificationController.deleteNotification
);

export default router;