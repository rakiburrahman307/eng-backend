import express from "express";
import { MatchPlayerSelectionController } from "./matchPlayerSelection.controller";

const router = express.Router();

// CREATE
router.post("/", MatchPlayerSelectionController.createSelection);

// GET BY MATCH
router.get("/:matchId", MatchPlayerSelectionController.getSelections);

// GET ALL
router.get("/", MatchPlayerSelectionController.getAllSelections);

// GET SINGLE
router.get("/single/:id", MatchPlayerSelectionController.getSingleSelection);

// DELETE
router.delete("/:id", MatchPlayerSelectionController.deleteSelection);

export default router;