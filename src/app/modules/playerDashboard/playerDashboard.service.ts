import mongoose from "mongoose";

import { MatchResult } from "../matchResult/matchResult.model";
import { Team } from "../team/team.model";
import { UserDetails } from "../user/userDetails.model";

const getPlayerDashboardFromDB = async (playerId: string) => {
  const playerObjectId = new mongoose.Types.ObjectId(playerId);

  // 👤 PLAYER INFO
  const player = await UserDetails.findOne({
    userId: playerObjectId,
  }).populate("selectTeam");

  // ⚽ MATCH STATS
  const stats = await MatchResult.aggregate([
    {
      $match: {
        player: playerObjectId,
      },
    },
    {
      $group: {
        _id: "$eventType",
        count: { $sum: 1 },
      },
    },
  ]);

  // 🔥 FORMAT STATS
  let goals = 0;
  let assists = 0;
  let yellowCards = 0;
  let redCards = 0;

  stats.forEach((item) => {
    if (item._id === "goal") goals = item.count;
    if (item._id === "assist") assists = item.count;
    if (item._id === "yellow_card") yellowCards = item.count;
    if (item._id === "red_card") redCards = item.count;
  });

  // 📊 RECENT MATCHES
  const recentMatches = await MatchResult.find({
    player: playerObjectId,
  })
    .sort({ createdAt: -1 })
    .limit(10)
    .populate("match team");

  return {
    player,
    stats: {
      goals,
      assists,
      yellowCards,
      redCards,
    },
    recentMatches,
  };
};

export const PlayerDashboardService = {
  getPlayerDashboardFromDB,
};