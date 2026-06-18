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

    // 🔥 Extra metadata for event details (scalable approach)
    eventMeta: {
      goalType: {
        type: String,
        enum: ['normal', 'penalty', 'header', 'own_goal', 'free_kick'],
        required: function () {
          return this.eventType === 'goal';
        },
      },

      cardType: {
        type: String,
        enum: ['yellow', 'red'],
        required: function () {
          return this.eventType === 'yellow_card' || this.eventType === 'red_card';
        },
      },

      substitutionType: {
        type: String,
        enum: ['in', 'out'],
        required: function () {
          return this.eventType === 'substitution';
        },
      },
    },

    minute: {
      type: Number,
      required: true,
      min: 0,
      max: 130,
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