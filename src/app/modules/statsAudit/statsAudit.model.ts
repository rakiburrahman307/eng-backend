import { Schema, model } from "mongoose";
import { IStatsAuditLog } from "./statsAudit.interface";

const statsAuditLogSchema = new Schema<IStatsAuditLog>(
  {
    player: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    modifiedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    field: {
      type: String,
      required: true, // e.g., 'cleanSheets', 'goals', 'assists', 'yellowCards', 'redCards'
    },
    previousValue: {
      type: Number,
      required: true,
    },
    newValue: {
      type: Number,
      required: true,
    },
    reason: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

statsAuditLogSchema.index({ player: 1, createdAt: -1 });

export const StatsAuditLog = model<IStatsAuditLog>(
  "StatsAuditLog",
  statsAuditLogSchema
);
