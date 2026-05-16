import { Schema, model } from 'mongoose';

const leagueTeamSchema = new Schema(
  {
    league: {
      type: Schema.Types.ObjectId,
      ref: 'League',
      required: true,
    },

    team: {
      type: Schema.Types.ObjectId,
      ref: 'Team',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

leagueTeamSchema.index(
  { league: 1, team: 1 },
  { unique: true }
);

export const LeagueTeam = model(
  'LeagueTeam',
  leagueTeamSchema
);