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
      unique: true,
    },
  },
  { timestamps: true }
);



export const ManagerTeam = model('ManagerTeam', managerTeamSchema);