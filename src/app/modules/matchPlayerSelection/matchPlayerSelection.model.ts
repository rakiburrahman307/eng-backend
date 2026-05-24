import { Schema, model } from "mongoose";

const matchPlayerSelectionSchema = new Schema(
  {
    match: {
      type: Schema.Types.ObjectId,
      ref: "Match",
      required: true,
    },

    team: {
      type: Schema.Types.ObjectId,
      ref: "Team",
      required: true,
    },

    player: {
      type: Schema.Types.ObjectId,
      ref: "UserDetails",
      required: true,
    },

    position: {
      type: String,
      required: true, // e.g. GK, DF, MF, FW
    },
  },
  {
    timestamps: true,
  }
);

export const MatchPlayerSelection = model(
  "MatchPlayerSelection",
  matchPlayerSelectionSchema
);