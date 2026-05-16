import { Schema, model } from 'mongoose';

const managerTeamSchema = new Schema(
  {
    manager: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    team: {
      type: Schema.Types.ObjectId,
      ref: 'Team',
      required: true,
    },
  },
  { timestamps: true }
);

managerTeamSchema.index({ manager: 1, team: 1 }, { unique: true });

export const ManagerTeam = model('ManagerTeam', managerTeamSchema);