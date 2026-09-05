import mongoose from "mongoose";
import { MatchResult } from "../matchResult/matchResult.model";
import { Match } from "../match/match.model";
import { League } from "../league/league.model";
import { LeagueTeam } from "../leagueTeam/leagueTeam.model";
import { User } from "../user/user.model";
import { Team } from "../team/team.model";

import { USER_ROLES } from "../../../enums/user";
import { getBatchPlayerStatsSummary, IPlayerStatsDetails } from "../../../helpers/playerStatsHelper";
import { getActivePremiumSubUserIds } from "../../../helpers/packageHelper";


const getTopPlayerFromDB = async (leagueId: string) => {
  const [parentIds, activePremiumSubUserIds] = await Promise.all([
    User.find({
      parentId: { $exists: true, $ne: null },
    }).distinct("parentId"),
    getActivePremiumSubUserIds(),
  ]);

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
      $match: {
        "player.role": {
          $in: [
            USER_ROLES.PLAYER,
            USER_ROLES.TOURNAMENT_PLAYER,
            USER_ROLES.OTHER_CLUBS,
          ],
        },
        "player._id": { $nin: parentIds },
        $or: [
          { "player._id": { $in: activePremiumSubUserIds } },
          { "player.parentId": { $in: activePremiumSubUserIds } },
        ],
      },
    },

    { $sort: { score: -1 } },
    { $limit: 1 },

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


const getLeagueSummaryFromDB = async (query?: Record<string, any>) => {
  const { leagueName, leagueId, league, season } = query || {};
  const directLeagueId = leagueId || (league && mongoose.Types.ObjectId.isValid(league as string) ? league : null);

  const matchedLeagueIds: mongoose.Types.ObjectId[] = [];
  if (directLeagueId && mongoose.Types.ObjectId.isValid(directLeagueId as string)) {
    matchedLeagueIds.push(new mongoose.Types.ObjectId(directLeagueId as string));
  }

  if (leagueName || season) {
    const filterConditions: any = {};
    if (leagueName && leagueName.trim()) {
      filterConditions.$or = [
        { leagueName: { $regex: leagueName.trim(), $options: "i" } },
        { name: { $regex: leagueName.trim(), $options: "i" } },
      ];
    }
    if (season && season.trim()) {
      filterConditions.season = { $regex: season.trim(), $options: "i" };
    }

    const leagues = await League.find(filterConditions).select("_id");
    leagues.forEach((l) => {
      if (!matchedLeagueIds.some((id) => id.toString() === l._id.toString())) {
        matchedLeagueIds.push(l._id);
      }
    });
  }

  const leagueFilter: any = {};
  if (matchedLeagueIds.length > 0) {
    const matchesInLeague = await Match.find({
      league: { $in: matchedLeagueIds },
    }).select("_id");
    const matchIds = matchesInLeague.map((m) => m._id);

    leagueFilter.$or = [
      { league: { $in: matchedLeagueIds } },
      { match: { $in: matchIds } },
    ];
  }

  // 1. Fetch top 1 from each category using the unified leaderboard logic
  const [topGoalList, topAssistList, topCleanSheetList, topOverallList] =
    await Promise.all([
      getTopGoalScorersFromDB({ ...query, limit: 1 }),
      getTopAssistsFromDB({ ...query, limit: 1 }),
      getTopCleanSheetsFromDB({ ...query, limit: 1 }),
      getTopOverallPlayersFromDB({ ...query, limit: 1 }),
    ]);

  const defaultPlayer = {
    _id: null,
    playerId: null,
    firstName: "",
    lastName: "",
    userName: "",
    profile: "",
    jerseyNumber: null,
    position: null,
    ageGroup: null,
    team: null,
    marketValue: 0,
    engCoine: 0,
    goals: 0,
    totalGoals: 0,
    assists: 0,
    totalAssists: 0,
    cleanSheets: 0,
    totalCleanSheets: 0,
    playerOfTheDay: 0,
    totalPlayerOfTheDay: 0,
    score: 0,
    stats: {
      goals: 0,
      assists: 0,
      cleanSheets: 0,
      playerOfTheDay: 0,
      yellowCards: 0,
      redCards: 0,
      score: 0,
    },
  };

  const topGoalScorer = topGoalList[0] || defaultPlayer;
  const topAssistPlayer = topAssistList[0] || defaultPlayer;
  const topCleanSheetPlayer = topCleanSheetList[0] || defaultPlayer;
  const topOverallPlayer = topOverallList[0] || defaultPlayer;

  // 2. Team Stats for League
  const [topGoalTeam, topAssistTeam] = await Promise.all([
    MatchResult.aggregate([
      {
        $match: {
          ...leagueFilter,
          eventType: "goal",
        },
      },
      {
        $group: {
          _id: "$team",
          totalGoals: { $sum: 1 },
        },
      },
      {
        $sort: { totalGoals: -1 },
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
          teamLogo: { $ifNull: ["$team.teamLogo", "$team.logo"] },
        },
      },
    ]),
    MatchResult.aggregate([
      {
        $match: {
          ...leagueFilter,
          eventType: "assist",
        },
      },
      {
        $group: {
          _id: "$team",
          totalAssists: { $sum: 1 },
        },
      },
      {
        $sort: { totalAssists: -1 },
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
          teamLogo: { $ifNull: ["$team.teamLogo", "$team.logo"] },
        },
      },
    ]),
  ]);

  return {
    topGoalScorer,
    topAssistPlayer,
    topCleanSheetPlayer,
    topCleanSheet: topCleanSheetPlayer,
    topOverallPlayer,
    topOverall: topOverallPlayer,
    topGoalTeam: topGoalTeam[0] || {
      totalGoals: 0,
      teamName: "",
      teamLogo: "",
    },
    topAssistTeam: topAssistTeam[0] || {
      totalAssists: 0,
      teamName: "",
      teamLogo: "",
    },
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

  const [parentIds, activePremiumSubUserIds] = await Promise.all([
    User.find({
      parentId: { $exists: true, $ne: null },
    }).distinct("parentId"),
    getActivePremiumSubUserIds(),
  ]);

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
      $match: {
        "user.role": {
          $in: [
            USER_ROLES.PLAYER,
            USER_ROLES.TOURNAMENT_PLAYER,
            USER_ROLES.OTHER_CLUBS,
          ],
        },
        "user._id": { $nin: parentIds },
        $or: [
          { "user._id": { $in: activePremiumSubUserIds } },
          { "user.parentId": { $in: activePremiumSubUserIds } },
        ],
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
      $project: {
        _id: 0,
        firstName: "$user.firstName",
        lastName: "$user.lastName",
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
      $match: {
        "user.role": {
          $in: [
            USER_ROLES.PLAYER,
            USER_ROLES.TOURNAMENT_PLAYER,
            USER_ROLES.OTHER_CLUBS,
          ],
        },
        "user._id": { $nin: parentIds },
        $or: [
          { "user._id": { $in: activePremiumSubUserIds } },
          { "user.parentId": { $in: activePremiumSubUserIds } },
        ],
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
      $project: {
        _id: 0,
        firstName: "$user.firstName",
        lastName: "$user.lastName",
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

/**
 * Common helper to get enriched players with stats and team info
 */
const getEnrichedPlayersWithStats = async (query?: Record<string, any>) => {
  const { ageGroup, teamId, search, leagueName, leagueId, league, season, searchTerm } = query || {};
  const playerSearch = (search || searchTerm) as string;
  const directLeagueId = leagueId || (league && mongoose.Types.ObjectId.isValid(league as string) ? league : null);

  const matchedLeagueIds: mongoose.Types.ObjectId[] = [];
  if (directLeagueId && mongoose.Types.ObjectId.isValid(directLeagueId as string)) {
    matchedLeagueIds.push(new mongoose.Types.ObjectId(directLeagueId as string));
  }

  if (leagueName || season) {
    const filterConditions: any = {};
    if (leagueName && leagueName.trim()) {
      filterConditions.$or = [
        { leagueName: { $regex: leagueName.trim(), $options: "i" } },
        { name: { $regex: leagueName.trim(), $options: "i" } },
      ];
    }
    if (season && season.trim()) {
      filterConditions.season = { $regex: season.trim(), $options: "i" };
    }

    const leagues = await League.find(filterConditions).select("_id");
    leagues.forEach((l) => {
      if (!matchedLeagueIds.some((id) => id.toString() === l._id.toString())) {
        matchedLeagueIds.push(l._id);
      }
    });

    if (!matchedLeagueIds.length) {
      return [];
    }
  }

  let matchFilterOptions: any = undefined;
  let teamIdsInLeague: mongoose.Types.ObjectId[] = [];

  if (matchedLeagueIds.length > 0) {
    const [matchesInLeague, leagueTeamLinks, directTeams] = await Promise.all([
      Match.find({ league: { $in: matchedLeagueIds } }).select("_id homeTeam awayTeam"),
      LeagueTeam.find({ league: { $in: matchedLeagueIds } }).select("team"),
      Team.find({ league: { $in: matchedLeagueIds } }).select("_id"),
    ]);

    const matchIds = matchesInLeague.map((m) => m._id);
    const leagueTeamIds = leagueTeamLinks.map((lt) => lt.team).filter(Boolean);
    const directTeamIds = directTeams.map((t) => t._id).filter(Boolean);
    const matchTeamIds = matchesInLeague.flatMap((m) => [m.homeTeam, m.awayTeam]).filter(Boolean);

    teamIdsInLeague = [
      ...new Set([...leagueTeamIds, ...directTeamIds, ...matchTeamIds].map((id) => id.toString())),
    ].map((id) => new mongoose.Types.ObjectId(id));

    if (!teamIdsInLeague.length) {
      return [];
    }

    matchFilterOptions = {
      matchFilter: {
        $or: [
          { league: { $in: matchedLeagueIds } },
          { match: { $in: matchIds } },
        ],
      },
      matchEvaluationFilter: {
        match: { $in: matchIds },
      },
    };
  }

  const [parentIds, activePremiumSubUserIds] = await Promise.all([
    User.find({
      parentId: { $exists: true, $ne: null },
    }).distinct("parentId"),
    getActivePremiumSubUserIds(),
  ]);

  const userFilter: any = {
    _id: { $in: activePremiumSubUserIds, $nin: parentIds },
    role: {
      $in: [
        USER_ROLES.PLAYER,
        USER_ROLES.TOURNAMENT_PLAYER,
        USER_ROLES.OTHER_CLUBS,
      ],
    },
    status: "APPROVED",
  };

  if (ageGroup) {
    userFilter.ageGroup = { $regex: new RegExp(`^${ageGroup.toString().trim()}$`, "i") };
  }

  if (teamId) {
    userFilter.selectTeam = mongoose.Types.ObjectId.isValid(teamId as string)
      ? new mongoose.Types.ObjectId(teamId as string)
      : teamId;
  } else if (teamIdsInLeague.length > 0) {
    userFilter.selectTeam = { $in: teamIdsInLeague };
  }

  if (playerSearch && playerSearch.trim()) {
    const searchRegex = new RegExp(playerSearch.trim(), "i");
    userFilter.$and.push({
      $or: [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { userName: searchRegex },
      ],
    });
  }

  const players = await User.find(userFilter)
    .select(
      "_id firstName lastName userName profile jerseyNumber position ageGroup selectTeam engCoine marketValue"
    )
    .populate({
      path: "selectTeam",
      select: "_id teamName shortName teamLogo city country",
    })
    .lean();

  if (!players.length) {
    return [];
  }

  const playerIds = players.map((p) => p._id);
  const statsMap = await getBatchPlayerStatsSummary(playerIds, matchFilterOptions);

  return players.map((p: any) => {
    const stats: IPlayerStatsDetails = statsMap.get(p._id.toString()) || {
      goals: 0,
      assists: 0,
      cleanSheets: 0,
      playerOfTheDay: 0,
      yellowCards: 0,
      redCards: 0,
    };

    const score =
      (stats.goals * 4) +
      (stats.assists * 3) +
      (stats.cleanSheets * 3) +
      (stats.playerOfTheDay * 5) -
      (stats.yellowCards * 1) -
      (stats.redCards * 3);

    return {
      _id: p._id,
      playerId: p._id,
      firstName: p.firstName || null,
      lastName: p.lastName || null,
      userName:
        p.userName ||
        (p.firstName ? `${p.firstName} ${p.lastName || ""}`.trim() : "Player"),
      profile: p.profile || null,
      jerseyNumber: p.jerseyNumber || null,
      position: p.position || null,
      ageGroup: p.ageGroup || null,
      team: p.selectTeam || null,
      marketValue: p.marketValue || 0,
      engCoine: p.engCoine || 0,
      goals: stats.goals,
      totalGoals: stats.goals,
      assists: stats.assists,
      totalAssists: stats.assists,
      cleanSheets: stats.cleanSheets,
      totalCleanSheets: stats.cleanSheets,
      playerOfTheDay: stats.playerOfTheDay,
      totalPlayerOfTheDay: stats.playerOfTheDay,
      score,
      stats: {
        ...stats,
        score,
      },
    };
  });
};

// 1. ⚽ TOP 20 GOAL SCORERS
const getTopGoalScorersFromDB = async (query?: Record<string, any>) => {
  const limit = parseInt(query?.limit as string) || 20;
  const enriched = await getEnrichedPlayersWithStats(query);

  const sorted = enriched
    .sort((a, b) => {
      if (b.goals !== a.goals) return b.goals - a.goals;
      if (b.playerOfTheDay !== a.playerOfTheDay) return b.playerOfTheDay - a.playerOfTheDay;
      return b.marketValue - a.marketValue;
    })
    .slice(0, limit)
    .map((player, idx) => ({
      rank: idx + 1,
      ...player,
    }));

  return sorted;
};

// 2. 👟 TOP 20 ASSIST PLAYERS
const getTopAssistsFromDB = async (query?: Record<string, any>) => {
  const limit = parseInt(query?.limit as string) || 20;
  const enriched = await getEnrichedPlayersWithStats(query);

  const sorted = enriched
    .sort((a, b) => {
      if (b.assists !== a.assists) return b.assists - a.assists;
      if (b.playerOfTheDay !== a.playerOfTheDay) return b.playerOfTheDay - a.playerOfTheDay;
      return b.marketValue - a.marketValue;
    })
    .slice(0, limit)
    .map((player, idx) => ({
      rank: idx + 1,
      ...player,
    }));

  return sorted;
};

// 3. 🧤 TOP 20 CLEAN SHEETS (Goalkeepers Only)
const getTopCleanSheetsFromDB = async (query?: Record<string, any>) => {
  const limit = parseInt(query?.limit as string) || 20;
  const enriched = await getEnrichedPlayersWithStats(query);

  // 🧤 Filter ONLY Goalkeepers (position: Goalkeeper / GK / Goal Keeper)
  const goalkeepers = enriched.filter((p) => {
    const pos = (p.position || "").toString().trim();
    return (
      /^(goalkeeper|gk|goal\s*keeper)$/i.test(pos) ||
      /gk|goalkeeper/i.test(pos)
    );
  });

  const sorted = goalkeepers
    .sort((a, b) => {
      if (b.cleanSheets !== a.cleanSheets) return b.cleanSheets - a.cleanSheets;
      if (b.playerOfTheDay !== a.playerOfTheDay) return b.playerOfTheDay - a.playerOfTheDay;
      return (b.marketValue || 0) - (a.marketValue || 0);
    })
    .slice(0, limit)
    .map((player, idx) => ({
      rank: idx + 1,
      ...player,
    }));

  return sorted;
};

// 4. 🌟 TOP 20 OVERALL BEST PLAYERS (Max Coin / engCoine Wise ONLY)
const getTopOverallPlayersFromDB = async (query?: Record<string, any>) => {
  const limit = parseInt(query?.limit as string) || 20;
  const enriched = await getEnrichedPlayersWithStats(query);

  // 🌟 Sorted strictly and purely by MAX COINS (engCoine) descending
  const sorted = enriched
    .sort((a, b) => {
      const aCoins = Number(a.engCoine) || 0;
      const bCoins = Number(b.engCoine) || 0;
      if (bCoins !== aCoins) return bCoins - aCoins;

      const aMarket = Number(a.marketValue) || 0;
      const bMarket = Number(b.marketValue) || 0;
      return bMarket - aMarket;
    })
    .slice(0, limit)
    .map((player, idx) => ({
      rank: idx + 1,
      ...player,
    }));

  return sorted;
};

export const StatisticService = {
  getTopPlayerFromDB,
  getPlayerSeasonStatsFromDB,
  getLeagueSummaryFromDB,
  getSeasonLeaderboardFromDB,
  getTopGoalScorersFromDB,
  getTopAssistsFromDB,
  getTopCleanSheetsFromDB,
  getTopOverallPlayersFromDB,
};