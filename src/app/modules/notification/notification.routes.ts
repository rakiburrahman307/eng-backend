import express from "express";
import auth from "../../middlewares/auth";
import { ROLE_GROUPS, USER_ROLES } from "../../../enums/user";
import { NotificationController } from "./notification.controller";

const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// PLAYER ROUTES
// ─────────────────────────────────────────────────────────────────────────────

// GET player's own notifications (paginated)
// GET /api/v1/notification/my?page=1&limit=10
router.get(
  "/my",
  auth(...ROLE_GROUPS.All),
  NotificationController.getMyNotifications
);

// GET unread count for logged-in user
// GET /api/v1/notification/unread-count
router.get(
  "/unread-count",
  auth(...ROLE_GROUPS.All),
  NotificationController.getUnreadCount
);

// PATCH mark all notifications as read
// PATCH /api/v1/notification/read-all
router.patch(
  "/read-all",
  auth(...ROLE_GROUPS.All),
  NotificationController.markAllAsRead
);

// PATCH mark single notification as read
// PATCH /api/v1/notification/:id/read
router.patch(
  "/:id/read",
  auth(...ROLE_GROUPS.All),
  NotificationController.markAsRead
);

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN ROUTES
// ─────────────────────────────────────────────────────────────────────────────

// POST send notification to ALL users
// POST /api/v1/notification/send-all
router.post(
  "/send-all",
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  NotificationController.sendToAllUsers
);

// GET all notifications (admin view, paginated)
// GET /api/v1/notification/?page=1&limit=10
router.get(
  "/",
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  NotificationController.getAllNotifications
);

// DELETE notification by ID
// DELETE /api/v1/notification/:id
router.delete(
  "/:id",
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  NotificationController.deleteNotification
);

export default router;