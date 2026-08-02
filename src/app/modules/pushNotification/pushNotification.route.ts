import express from "express";
import { NotificationController } from "./pushNotification.controller";
import auth from "../../middlewares/auth";
import { ROLE_GROUPS } from "../../../enums/user";


const router = express.Router();

router.post("/send", auth(...ROLE_GROUPS.All), NotificationController.sendNotification);
router.get("/", auth(...ROLE_GROUPS.All), NotificationController.getNotifications);
router.patch("/read-all", auth(...ROLE_GROUPS.All), NotificationController.markAllAsRead);
router.patch("/:id/read", auth(...ROLE_GROUPS.All), NotificationController.markAsRead);
router.delete("/clear-all", auth(...ROLE_GROUPS.All), NotificationController.clearAllNotifications);
router.delete("/:id", auth(...ROLE_GROUPS.All), NotificationController.deleteNotification);

export default router;