import mongoose from "mongoose";
import { MatchResult } from "../matchResult/matchResult.model";
import { League } from "../league/league.model";


const getTopPlayerFromDB = async (leagueId: string) => {
  const result = await MatchResult.aggregate([
    {
      $match: {
        league: new mongoose.Types.ObjectId(leagueId),
      },
    },

    {
      $group: {
        _id: "$player",

        goals: {
          $sum: {
            $cond: [{ $eq: ["$eventType", "goal"] }, 1, 0],
          },
        },

        assists: {
          $sum: {
            $cond: [{ $eq: ["$eventType", "assist"] }, 1, 0],
          },
        },

        yellowCards: {
          $sum: {
            $cond: [{ $eq: ["$eventType", "yellow_card"] }, 1, 0],
          },
        },

        redCards: {
          $sum: {
            $cond: [{ $eq: ["$eventType", "red_card"] }, 1, 0],
          },
        },
      },
    },

    {
      $addFields: {
        score: {
          $subtract: [
            {
              $add: [
                { $multiply: ["$goals", 4] },
                { $multiply: ["$assists", 3] },
              ],
            },
            {
              $add: [
                { $multiply: ["$yellowCards", 1] },
                { $multiply: ["$redCards", 3] },
              ],
            },
          ],
        },
      },
    },

    { $sort: { score: -1 } },
    { $limit: 1 },

    {
      $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "_id",
        as: "player",
      },
    },

    { $unwind: "$player" },

    {
      $project: {
        _id: 0,
        player: {
        _id: "$player._id",
        email: "$player.email",
        role: "$player.role",
        profile: "$player.profile",
        username: "$player.userName",
        },
        goals: 1,
        assists: 1,
        yellowCards: 1,
        redCards: 1,
        score: 1,
      },
    },
  ]);

  return result[0] || null;
};

const getPlayerSeasonStatsFromDB = async (
  playerId: string,
  leagueId: string
) => {
  const stats = await MatchResult.aggregate([
    {
      $match: {
        player: new mongoose.Types.ObjectId(playerId),
        league: new mongoose.Types.ObjectId(leagueId),
      },
    },

    {
      $group: {
        _id: null,

        goals: {
          $sum: {
            $cond: [{ $eq: ["$eventType", "goal"] }, 1, 0],
          },
        },

        assists: {
          $sum: {
            $cond: [{ $eq: ["$eventType", "assist"] }, 1, 0],
          },
        },

        yellowCards: {
          $sum: {
            $cond: [{ $eq: ["$eventType", "yellow_card"] }, 1, 0],
          },
        },

        redCards: {
          $sum: {
            $cond: [{ $eq: ["$eventType", "red_card"] }, 1, 0],
          },
        },

        fouls: {
          $sum: {
            $cond: [{ $eq: ["$eventType", "foul"] }, 1, 0],
          },
        },

        totalMatches: {
          $addToSet: "$match",
        },
      },
    },

    {
      $project: {
        _id: 0,
        goals: 1,
        assists: 1,
        yellowCards: 1,
        redCards: 1,
        fouls: 1,
        totalMatches: { $size: "$totalMatches" },
      },
    },
  ]);

  return (
    stats[0] || {
      goals: 0,
      assists: 0,
      yellowCards: 0,
      redCards: 0,
      fouls: 0,
      totalMatches: 0,
    }
  );
};


const getLeagueSummaryFromDB = async (leagueName?: string) => {
  const leagueFilter: any = {};

  if (leagueName) {
    const league = await League.findOne({
      leagueName: {
        $regex: leagueName,
        $options: "i",
      },
    });

    if (!league) {
      return null;
    }

    leagueFilter.league = league._id;
  }

  // ==========================
  // Top Goal Scorer
  // ==========================

  const topGoalPlayer = await MatchResult.aggregate([
    {
      $match: {
        ...leagueFilter,
        eventType: "goal",
      },
    },

    {
      $group: {
        _id: "$player",
        totalGoals: {
          $sum: 1,
        },
      },
    },

    {
      $sort: {
        totalGoals: -1,
      },
    },

    {
      $limit: 1,
    },

    {
      $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "_id",
        as: "user",
      },
    },

    {
      $unwind: "$user",
    },

    {
      $lookup: {
        from: "userdetails",
        localField: "_id",
        foreignField: "userId",
        as: "details",
      },
    },

    {
      $unwind: "$details",
    },

    {
      $project: {
        _id: 0,
        totalGoals: 1,
        firstName: "$details.firstName",
        lastName: "$details.lastName",
        profile: "$user.profile",
      },
    },
  ]);

  // ==========================
  // Top Assist Player
  // ==========================

  const topAssistPlayer = await MatchResult.aggregate([
    {
      $match: {
        ...leagueFilter,
        eventType: "assist",
      },
    },

    {
      $group: {
        _id: "$player",
        totalAssists: {
          $sum: 1,
        },
      },
    },

    {
      $sort: {
        totalAssists: -1,
      },
    },

    {
      $limit: 1,
    },

    {
      $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "_id",
        as: "user",
      },
    },

    {
      $unwind: "$user",
    },

    {
      $lookup: {
        from: "userdetails",
        localField: "_id",
        foreignField: "userId",
        as: "details",
      },
    },

    {
      $unwind: "$details",
    },

    {
      $project: {
        _id: 0,
        totalAssists: 1,
        firstName: "$details.firstName",
        lastName: "$details.lastName",
        profile: "$user.profile",
      },
    },
  ]);

  // ==========================
  // Top Goal Team
  // ==========================

  const topGoalTeam = await MatchResult.aggregate([
    {
      $match: {
        ...leagueFilter,
        eventType: "goal",
      },
    },

    {
      $group: {
        _id: "$team",
        totalGoals: {
          $sum: 1,
        },
      },
    },

    {
      $sort: {
        totalGoals: -1,
      },
    },

    {
      $limit: 1,
    },

    {
      $lookup: {
        from: "teams",
        localField: "_id",
        foreignField: "_id",
        as: "team",
      },
    },

    {
      $unwind: "$team",
    },

    {
      $project: {
        _id: 0,
        totalGoals: 1,
        teamName: "$team.teamName",
        teamLogo: "$team.logo",
      },
    },
  ]);

  // ==========================
  // Top Assist Team
  // ==========================

  const topAssistTeam = await MatchResult.aggregate([
    {
      $match: {
        ...leagueFilter,
        eventType: "assist",
      },
    },

    {
      $group: {
        _id: "$team",
        totalAssists: {
          $sum: 1,
        },
      },
    },

    {
      $sort: {
        totalAssists: -1,
      },
    },

    {
      $limit: 1,
    },

    {
      $lookup: {
        from: "teams",
        localField: "_id",
        foreignField: "_id",
        as: "team",
      },
    },

    {
      $unwind: "$team",
    },

    {
      $project: {
        _id: 0,
        totalAssists: 1,
        teamName: "$team.teamName",
        teamLogo: "$team.logo",
      },
    },
  ]);

  return {
    topGoalScorer: topGoalPlayer[0] || '0',
    topAssistPlayer: topAssistPlayer[0] || '0',
    topGoalTeam: topGoalTeam[0] || '0',
    topAssistTeam: topAssistTeam[0] || '0',
  };
};



const getSeasonLeaderboardFromDB = async (season?: string) => {
  const matchFilter: any = {};

  if (season) {
    const leagues = await League.find({
      season: {
        $regex: season,
        $options: "i",
      },
    }).select("_id");

    if (!leagues.length) {
      return {
        goal: [],
        assist: [],
      };
    }

    matchFilter.league = {
      $in: leagues.map((l) => l._id),
    };
  }

  // ===============================
  // Goal Leaderboard
  // ===============================

  const goal = await MatchResult.aggregate([
    {
      $match: {
        ...matchFilter,
        eventType: "goal",
      },
    },

    {
      $group: {
        _id: "$player",
        totalGoals: {
          $sum: 1,
        },
      },
    },

    {
      $sort: {
        totalGoals: -1,
      },
    },

    {
      $limit: 50,
    },

    {
      $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "_id",
        as: "user",
      },
    },

    {
      $unwind: "$user",
    },

    {
      $lookup: {
        from: "userdetails",
        localField: "_id",
        foreignField: "userId",
        as: "details",
      },
    },

    {
      $unwind: "$details",
    },

    {
      $project: {
        _id: 0,
        firstName: "$details.firstName",
        lastName: "$details.lastName",
        profile: "$user.profile",
        totalGoals: 1,
      },
    },
  ]).then((players) =>
    players.map((player, index) => ({
      rank: index + 1,
      ...player,
    }))
  );

  // ===============================
  // Assist Leaderboard
  // ===============================

  const assist = await MatchResult.aggregate([
    {
      $match: {
        ...matchFilter,
        eventType: "assist",
      },
    },

    {
      $group: {
        _id: "$player",
        totalAssists: {
          $sum: 1,
        },
      },
    },

    {
      $sort: {
        totalAssists: -1,
      },
    },

    {
      $limit: 50,
    },

    {
      $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "_id",
        as: "user",
      },
    },

    {
      $unwind: "$user",
    },

    {
      $lookup: {
        from: "userdetails",
        localField: "_id",
        foreignField: "userId",
        as: "details",
      },
    },

    {
      $unwind: "$details",
    },

    {
      $project: {
        _id: 0,
        firstName: "$details.firstName",
        lastName: "$details.lastName",
        profile: "$user.profile",
        totalAssists: 1,
      },
    },
  ]).then((players) =>
    players.map((player, index) => ({
      rank: index + 1,
      ...player,
    }))
  );

  return {
    goal,
    assist,
  };
};
 

export const StatisticService = {
  getTopPlayerFromDB,
  getPlayerSeasonStatsFromDB,
  getLeagueSummaryFromDB,
  getSeasonLeaderboardFromDB
};