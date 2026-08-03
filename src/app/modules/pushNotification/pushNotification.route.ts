import express from "express";
import { NotificationController } from "./pushNotification.controller";
import auth from "../../middlewares/auth";
import { ROLE_GROUPS } from "../../../enums/user";


const router = express.Router();

router.post("/send", auth(...ROLE_GROUPS.All), NotificationController.sendNotification);
router.get("/", auth(...ROLE_GROUPS.All), NotificationController.getNotifications);
router.delete("/clear-all", auth(...ROLE_GROUPS.All), NotificationController.clearAllNotifications);
router.delete("/delete/:id", auth(...ROLE_GROUPS.All), NotificationController.deleteNotification);

export default router;