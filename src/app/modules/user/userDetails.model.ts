import { Schema, model } from "mongoose";
import { IUserDetails, AGE_GROUP, SELECT_GROUP } from "./userDetails.interface";

const userDetailsSchema = new Schema<IUserDetails>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    firstName: {
      type: String,
      required: true,
      trim: true,
    },

    lastName: {
      type: String,
      required: true,
      trim: true,
    },

    dateOfBirth: {
      type: Date,
      required: true,
    },

    ageGroup: {
      type: String,
      enum: Object.values(AGE_GROUP),
      required: false,
    },

    selectTeam: {
      type: Schema.Types.ObjectId,
      ref: "Team",
      required: false,
    },
    strongFoot: {
      type: String,
      default: false,
    },

    position: {
      type: String,
      default: null,
    },

    document: {
    type: [String],
    default: []
  },

    phone: {
      type: String,
      required: false,
    },
    engCoine: {
      type: Number,
      default: 0,
    },
    debutDate: {
      type: Date,
      default: "null",
    },
    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      default: "PENDING",
    },
  },
  {
    timestamps: true,
  }
);

export const UserDetails = model<IUserDetails>(
  "UserDetails",
  userDetailsSchema
);