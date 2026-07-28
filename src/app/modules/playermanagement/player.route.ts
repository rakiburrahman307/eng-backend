import express from "express";
import auth from "../../middlewares/auth";
import { PlayerController } from "./player.controller";

const router = express.Router();

// GET ALL PLAYERS (auth(false) decodes user if token provided)
router.get("/", auth(false), PlayerController.getAllPlayers);

// ✅ FILTER PLAYERS BY TEAM AND/OR POSITION
router.get("/filter", auth(false), PlayerController.getFilteredPlayers);

export default router;