import mongoose from "mongoose";
import { Team } from "../team/team.model";
import { Match } from "../match/match.model";
import { MatchResult } from "../matchResult/matchResult.model";
import { User } from "../user/user.model";
import { ManagerTeam } from "../managerTeam/managerTeam.model";


import { USER_ROLES } from "../../../enums/user";

const getTeamDashboardFromDB = async (teamId: string) => {
  const teamObjectId = new mongoose.Types.ObjectId(teamId);

  // 👥 PLAYERS (Only genuine Player profiles, exclude Parent accounts)
  const rawPlayers = await User.find({
    $or: [
      { selectTeam: teamObjectId },
      { selectTeam: teamId },
      { selectTeam: teamObjectId.toString() },
    ],
    role: { $in: [USER_ROLES.PLAYER, USER_ROLES.TOURNAMENT_PLAYER, USER_ROLES.OTHER_CLUBS] },
    status: 'APPROVED',
    $nor: [
      {
        parentId: null,
        email: { $ne: null },
        position: null,
        dateOfBirth: null,
      }
    ]
  })
    .select("_id firstName lastName userName profile position ageGroup dateOfBirth selectTeam status emergencyEmail emergencyPhone role")
    .lean();

  const players = rawPlayers.map((p: any) => ({
    _id: p._id,
    userId: p._id,
    firstName: p.firstName || null,
    lastName: p.lastName || null,
    userName: p.userName || (p.firstName ? `${p.firstName} ${p.lastName || ''}`.trim() : 'Player'),
    profile: p.profile || null,
    position: p.position || 'BENCH',
    ageGroup: p.ageGroup || null,
    dateOfBirth: p.dateOfBirth || null,
    status: p.status || 'APPROVED',
  }));

  const totalPlayers = players.length;

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
  }).populate("player", "firstName lastName ");

  // 🏟 TEAM INFO
  const team = await Team.findById(teamObjectId).select(
    "teamName shortName teamLogo city country stadiumName"
  );

  return {
    team,
    totalPlayers,
    players,
    upcomingMatches,
    recentMatches,
    matchResults,
  };
};



const getClubOverviewFromDB = async (teamId: string) => {
  const teamObjectId = new mongoose.Types.ObjectId(teamId);

  // Team Info
  const managerTeam = await ManagerTeam.findOne({
    team: teamObjectId,
  });

  if (!managerTeam) {
    throw new Error("Team not found");
  }

  // Current League
  const latestMatch = await Match.findOne({
    $or: [
      { homeTeam: teamObjectId },
      { awayTeam: teamObjectId },
    ],
  }).sort({ createdAt: -1 });

  if (!latestMatch) {
    return null;
  }

  const leagueId = latestMatch.league;

  // All finished matches in league
  const matches = await Match.find({
    league: leagueId,
    status: "finished",
  });

  const standings: Record<string, any> = {};

  matches.forEach((match) => {
    const homeId = match.homeTeam.toString();
    const awayId = match.awayTeam.toString();

    if (!standings[homeId]) {
      standings[homeId] = {
        teamId: homeId,
        points: 0,
        played: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goalDifference: 0,
      };
    }

    if (!standings[awayId]) {
      standings[awayId] = {
        teamId: awayId,
        points: 0,
        played: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goalDifference: 0,
      };
    }

    standings[homeId].played++;
    standings[awayId].played++;

    standings[homeId].goalDifference +=
      match.homeScore - match.awayScore;

    standings[awayId].goalDifference +=
      match.awayScore - match.homeScore;

    if (match.homeScore > match.awayScore) {
      standings[homeId].wins++;
      standings[homeId].points += 3;

      standings[awayId].losses++;
    } else if (match.homeScore < match.awayScore) {
      standings[awayId].wins++;
      standings[awayId].points += 3;

      standings[homeId].losses++;
    } else {
      standings[homeId].draws++;
      standings[awayId].draws++;

      standings[homeId].points += 1;
      standings[awayId].points += 1;
    }
  });

  // Sort Table
  const table = Object.values(standings).sort(
    (a: any, b: any) =>
      b.points - a.points ||
      b.goalDifference - a.goalDifference
  );

  const position =
    table.findIndex(
      (item: any) =>
        item.teamId === teamObjectId.toString()
    ) + 1;

  const currentTeam = table.find(
    (item: any) =>
      item.teamId === teamObjectId.toString()
  );

  // Last 2 Results
  const recentResults = await Match.find({
    $or: [
      { homeTeam: teamObjectId },
      { awayTeam: teamObjectId },
    ],
    status: "finished",
  })
    .sort({ matchDate: -1 })
    .limit(2)
    .populate(
      "homeTeam awayTeam",
      "teamName shortName teamLogo"
    );

  // Next 2 Matches
  const upcomingMatches = await Match.find({
    $or: [
      { homeTeam: teamObjectId },
      { awayTeam: teamObjectId },
    ],
    status: "upcoming",
  })
    .sort({ matchDate: 1 })
    .limit(2)
    .populate(
      "homeTeam awayTeam",
      "teamName shortName teamLogo"
    );

  return {
    position,
    points: currentTeam?.points || 0,
    recentResults,
    upcomingMatches,
  };
};

export const TeamDashboardService = {
    getTeamDashboardFromDB,
    getClubOverviewFromDB,
};