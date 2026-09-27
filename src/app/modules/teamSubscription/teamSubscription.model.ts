import { Schema, model } from "mongoose";
import { ITeamSubscription } from "./teamSubscription.interface";

const teamSubscriptionSchema = new Schema<ITeamSubscription>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    team: {
      type: Schema.Types.ObjectId,
      ref: "Team",
      required: true,
      index: true,
    },
    isBellActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    subscribedAt: {
      type: Date,
      default: Date.now,
    },
    unsubscribedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index: A user has exactly one subscription record per team
teamSubscriptionSchema.index({ user: 1, team: 1 }, { unique: true });

// Optimized query index for broadcasting notifications to all active team subscribers
teamSubscriptionSchema.index({ team: 1, isBellActive: 1 });

// Optimized query index for fetching all teams subscribed by a user
teamSubscriptionSchema.index({ user: 1, isBellActive: 1 });

export const TeamSubscription = model<ITeamSubscription>(
  "TeamSubscription",
  teamSubscriptionSchema
);
