import express from "express";
import { MatchPlayerSelectionController } from "./matchPlayerSelection.controller";

const router = express.Router();

// CREATE
router.post("/", MatchPlayerSelectionController.createSelection);

// GET ALL
router.get("/", MatchPlayerSelectionController.getAllSelections);

router.get(
  "/filter",
  MatchPlayerSelectionController.getPlayersByMatchAndTeam
);

// GET SINGLE
router.get("/:id", MatchPlayerSelectionController.getSingleSelection);

// UPDATE
router.patch("/:id", MatchPlayerSelectionController.updateSelection);

// DELETE
router.delete("/:id", MatchPlayerSelectionController.deleteSelection);

export default router;