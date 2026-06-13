import { Schema, model } from "mongoose";

const playerSelectionSchema = new Schema(
  {
    player: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    position: {
      type: String,
      required: true, // GK, DF, MF, FW
        },
    positionIndex: {
      type: Number,
      required: true, // To maintain the order of players in the same position
    },

    substitute: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

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
    teamFormation: {
      type: String,
      required: true, // e.g., "4-4-2", "4-3-3", "3-5-2"
    },

    players: {
      type: [playerSelectionSchema],
      required: true,
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