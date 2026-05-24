import express from "express";
import { OverviewController } from "./overview.controller";

const router = express.Router();

router.get("/", OverviewController.getOverview);

export default router;