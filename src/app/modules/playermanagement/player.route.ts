import express from "express";
import { PlayerController } from "./player.controller";


const router = express.Router();

// PLAYER DASHBOARD
router.get("/", PlayerController.getAllPlayers);

export default router;