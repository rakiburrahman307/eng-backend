import mongoose from "mongoose";
import { Team } from "../team/team.model";
import { Match } from "../match/match.model";
import { MatchResult } from "../matchResult/matchResult.model";
import { UserDetails } from "../user/userDetails.model";


const getTeamDashboardFromDB = async (teamId: string) => {
  const teamObjectId = new mongoose.Types.ObjectId(teamId);

  // 👥 PLAYERS
 const playersAgg = await UserDetails.aggregate([
  {
    $match: { selectTeam: teamObjectId },
  },

  {
    $lookup: {
      from: "users",
      localField: "userId",
      foreignField: "_id",
      as: "user",
    },
  },

  {
    $unwind: {
      path: "$user",
      preserveNullAndEmptyArrays: true,
    },
  },

  {
    $project: {
      firstName: 1,
      lastName: 1,
      profile: "$user.profile",
      position: 1,
    },
  },
]);

  const totalPlayers = playersAgg.length;

  // 📅 UPCOMING MATCHES
  const upcomingMatches = await Match.find({
    $or: [{ homeTeam: teamObjectId }, { awayTeam: teamObjectId }],
    status: "upcoming",
  })
    .sort({ matchDate: 1 })
    .limit(5)
    .populate("homeTeam awayTeam", "teamName shortName teamLogo");

  // 🏁 RECENT MATCHES
  const recentMatches = await Match.find({
    $or: [{ homeTeam: teamObjectId }, { awayTeam: teamObjectId }],
    status: "finished",
  })
    .sort({ matchDate: -1 })
    .limit(5)
    .populate("homeTeam awayTeam", "teamName shortName teamLogo");

  // 📊 MATCH RESULTS
  const matchIds = recentMatches.map((m) => m._id);

  const matchResults = await MatchResult.find({
    match: { $in: matchIds },
    team: teamObjectId,
  }).populate("player", "firstName lastName");

  // 🏟 TEAM INFO
  const team = await Team.findById(teamObjectId).select(
    "teamName shortName teamLogo city country stadiumName"
  );

  return {
    team,
    totalPlayers,
    players: playersAgg,
    upcomingMatches,
    recentMatches,
    matchResults,
  };
};

export const TeamDashboardService = {
  getTeamDashboardFromDB,
};