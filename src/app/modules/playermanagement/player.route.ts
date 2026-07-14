import express from "express";
import { PlayerController } from "./player.controller";


const router = express.Router();

// GET ALL PLAYERS
router.get("/", PlayerController.getAllPlayers);

// ✅ FILTER PLAYERS BY TEAM AND/OR POSITION
// Usage: GET /players/filter?team=<teamId>&position=Striker&page=1&limit=10
router.get("/filter", PlayerController.getFilteredPlayers);

export default router;