import { Schema, model } from 'mongoose';

const matchResultSchema = new Schema(
  {

    league: {
      type: Schema.Types.ObjectId,
      ref: 'League',
      required: true,
    },
    match: {
      type: Schema.Types.ObjectId,
      ref: 'Match',
      required: true,
    },

    team: {
      type: Schema.Types.ObjectId,
      ref: 'Team',
      required: true,
    },

   player: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: false,
    },

    eventType: {
      type: String,
      enum: [
        'goal',
        'assist',
        'yellow_card',
        'red_card',
        'foul',
        'substitution',
      ],
      required: true,
    },

    minute: {
      type: Number,
      required: true,
    },

    

    addedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export const MatchResult = model('MatchResult', matchResultSchema);