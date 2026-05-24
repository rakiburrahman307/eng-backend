import express from "express";
import { NotificationController } from "./pushNotification.controller";


const router = express.Router();

router.post("/send", NotificationController.sendNotification);
router.get("/", NotificationController.getNotifications);

export default router;