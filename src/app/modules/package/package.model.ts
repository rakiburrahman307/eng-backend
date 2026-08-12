import { model, Schema } from "mongoose";
import { IPackage, PackageModel } from "./package.interface";

const featureSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    isIncluded: { type: Boolean, default: true },
  },
  { _id: false }
);

const packageSchema = new Schema<IPackage, PackageModel>({
    title: { type: String, required: true },
    description: { type: String, required: true },

    features: {
        type: [featureSchema],
        default: [],
    },

    userType: {
        type: String,
        enum: [
            'Player', 'Manager', 'Club', 'Referee', 'Other', 'Tournament Player', 'Trial Player', 'OTHER_CLUBS',
            'PLAYER', 'MANAGER', 'CLUB', 'REFEREE', 'TOURNAMENT_PLAYER', 'TRIAL_PLAYER', 'OTHER'
        ],
        default: 'Player'
    },

    packageType: {
        type: String,
        enum: [
            'Semi Pro', 'Professional', 'Other', 'Tournament Player', 'Trial Player',
            'SEMI_PRO', 'PROFESSIONAL', 'TOURNAMENT_PLAYER', 'TRIAL_PLAYER', 'OTHER'
        ],
        default: 'Professional'
    },

    canViewOtherPlayers: {
        type: Boolean,
        default: true
    },

    canRedeemPoints: {
        type: Boolean,
        default: true
    },

    canViewOtherPlayerStats: {
        type: Boolean,
        default: true
    },

    canEarnPoints: {
        type: Boolean,
        default: true
    },

    price: { type: Number, required: true },

    duration: {
        type: String,
        default: '1 month'
    },

    paymentType: {
        type: String,
        enum: ['Monthly', 'Quarterly', 'Yearly', 'One-time', 'One-Time', 'MONTHLY', 'QUARTERLY', 'YEARLY', 'ONE_TIME', 'ONE-TIME'],
        default: 'Monthly'
    },

    stripeProductId: {
        type: String,
        required: true
    },

    stripePriceId: {
        type: String,
        required: true
    },

    credit: { type: Number, default: 0 },

    status: {
        type: String,
        enum: ['Active', 'Delete'],
        default: "Active"
    }
}, { timestamps: true });

export const Package = model<IPackage, PackageModel>("Package", packageSchema);