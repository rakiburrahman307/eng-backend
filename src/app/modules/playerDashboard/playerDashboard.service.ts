import mongoose from "mongoose";

import { MatchResult } from "../matchResult/matchResult.model";
import { Team } from "../team/team.model";
import { User } from "../user/user.model";


import { StatusCodes } from "http-status-codes";
import { USER_ROLES } from "../../../enums/user";
import ApiError from "../../../errors/ApiErrors";

import { Subscription } from "../subscription/subscription.model";
import { isPremiumPlayerPackage } from "../../../helpers/packageHelper";

const getPlayerDashboardFromDB = async (playerId: string) => {
  const playerObjectId = new mongoose.Types.ObjectId(playerId);

  // 👤 PLAYER INFO (Filter by PLAYER / TOURNAMENT_PLAYER roles only)
  const player = await User.findOne({
    _id: playerObjectId,
    role: { $in: [USER_ROLES.PLAYER, USER_ROLES.TOURNAMENT_PLAYER] },
  }).populate("selectTeam");

  if (!player) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Player not found or specified user is not a player");
  }

  // Calculate age
  const today = new Date();
  const dob = player.dateOfBirth ? new Date(player.dateOfBirth) : today;

  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < dob.getDate())
  ) {
    age--;
  }

  const playerData: any = player.toObject();

  // Add profile and age separately
  playerData.profile = playerData.profile || null;
//   playerData.age = age;

  // Optional: mapping _id to userId for consistency
  playerData.userId = playerObjectId;

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

  const activeSub = await Subscription.findOne({
    user: player._id,
    status: "active",
  }).populate("package").lean();

  const pkg: any = activeSub?.package;
  const isPremium = await isPremiumPlayerPackage(pkg);

  if (!isPremium) {
    playerData.engCoine = null;
    playerData.marketValue = null;
  }

  return {
    player: playerData,
    activeSubscription: activeSub || null,
    activePackage: activeSub?.package || null,
    isPremium,
    stats: isPremium ? {
      goals,
      assists,
      yellowCards,
      redCards,
    } : null,
    recentMatches: isPremium ? recentMatches : [],
  };
};

export const PlayerDashboardService = {
  getPlayerDashboardFromDB,
};