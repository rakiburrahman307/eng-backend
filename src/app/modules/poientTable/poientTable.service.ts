import { League } from "../league/league.model";
import { LeagueTeam } from "../leagueTeam/leagueTeam.model";
import { Match } from "../match/match.model";
import { Team } from "../team/team.model";
import { User } from "../user/user.model";
import { USER_ROLES } from "../../../enums/user";
import { Subscription } from "../subscription/subscription.model";
import { getBatchPlayerStatsSummary } from "../../../helpers/playerStatsHelper";
import mongoose from "mongoose";

// Helper to calculate standings synchronously from prefetched teams & matches
const computeStandings = (leagueTeams: any[], matches: any[]) => {
  // Sort matches chronologically
  const sortedMatches = [...matches].sort((a, b) => {
    const dateA = new Date(a.matchDate || a.createdAt || 0).getTime();
    const dateB = new Date(b.matchDate || b.createdAt || 0).getTime();
    return dateA - dateB;
  });

  // Helper to build raw table from given match list
  const buildRawTable = (matchList: any[]) => {
    const table: Record<string, any> = {};

    for (const lt of leagueTeams) {
      if (!lt.team) continue;
      const team: any = lt.team;

      table[team._id.toString()] = {
        team,
        played: 0,
        win: 0,
        draw: 0,
        loss: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0,
        points: 0,
      };
    }

    for (const match of matchList) {
      const homeId = match.homeTeam?.toString();
      const awayId = match.awayTeam?.toString();

      const homeScore = match.homeScore || 0;
      const awayScore = match.awayScore || 0;

      if (!table[homeId] || !table[awayId]) continue;

      table[homeId].played++;
      table[awayId].played++;

      table[homeId].goalsFor += homeScore;
      table[homeId].goalsAgainst += awayScore;

      table[awayId].goalsFor += awayScore;
      table[awayId].goalsAgainst += homeScore;

      if (homeScore > awayScore) {
        table[homeId].win++;
        table[homeId].points += 3;
        table[awayId].loss++;
      } else if (awayScore > homeScore) {
        table[awayId].win++;
        table[awayId].points += 3;
        table[homeId].loss++;
      } else {
        table[homeId].draw++;
        table[awayId].draw++;
        table[homeId].points += 1;
        table[awayId].points += 1;
      }
    }

    for (const teamId in table) {
      table[teamId].goalDifference =
        table[teamId].goalsFor - table[teamId].goalsAgainst;
    }

    const list = Object.values(table);
    // Sort by Points (desc), Goal Difference (desc), Goals For (desc), Team Name (asc)
    list.sort((a: any, b: any) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goalDifference !== a.goalDifference)
        return b.goalDifference - a.goalDifference;
      if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
      return (a.team?.teamName || "").localeCompare(b.team?.teamName || "");
    });

    return list;
  };

  // 1. Current Full Standings
  const currentStandings = buildRawTable(sortedMatches);

  // 2. Previous Standings (before last match) to determine trend (UP/DOWN/SAME)
  const prevMatches =
    sortedMatches.length > 0
      ? sortedMatches.slice(0, sortedMatches.length - 1)
      : [];
  const prevStandings = buildRawTable(prevMatches);

  const prevRankMap: Record<string, number> = {};
  prevStandings.forEach((item: any, index: number) => {
    if (item.team?._id) {
      prevRankMap[item.team._id.toString()] = index + 1;
    }
  });

  // 3. Attach position, rank, movement trend (UP/DOWN/SAME), symbol (▲/▼/•)
  return currentStandings.map((item: any, index: number) => {
    const position = index + 1;
    const teamId = item.team?._id?.toString();
    const prevPosition = teamId ? prevRankMap[teamId] : undefined;

    let movement = "SAME";
    let symbol = "•";
    let positionChange = 0;

    if (
      prevPosition !== undefined &&
      sortedMatches.length > 0 &&
      item.played > 0
    ) {
      if (position < prevPosition) {
        movement = "UP";
        symbol = "▲";
        positionChange = prevPosition - position;
      } else if (position > prevPosition) {
        movement = "DOWN";
        symbol = "▼";
        positionChange = position - prevPosition;
      }
    }

    return {
      position,
      rank: position,
      movement,
      trend: movement,
      symbol,
      positionChange,
      ...item,
    };
  });
};

// =========================
// SINGLE LEAGUE CALC
// =========================
const calculateLeague = async (league: any) => {
  const leagueId = league._id.toString();

  const [leagueTeams, matches] = await Promise.all([
    LeagueTeam.find({ league: leagueId }).populate(
      "team",
      "teamName shortName teamLogo",
    ),
    Match.find({
      league: leagueId,
      status: "finished",
      matchType: { $nin: ["friendly", "cup"] },
    }),
  ]);

  return computeStandings(leagueTeams, matches);
};

// =========================
// MAIN API (WITH STRICT FILTERING BY QUERY)
// =========================
const getPointTable = async (query: Record<string, any> = {}) => {
  const {
    leagueId,
    id,
    _id,
    season,
    leagueName,
    year,
    page,
    limit,
    teamId,
    team,
    team_id,
    selectTeam,
    playerId,
    player,
    player_id,
  } = query;

  let targetTeamId = teamId || team || team_id || selectTeam;
  const targetPlayerId = playerId || player || player_id;

  // If playerId is provided instead of teamId, lookup player's team
  if (targetPlayerId && !targetTeamId) {
    if (mongoose.Types.ObjectId.isValid(targetPlayerId)) {
      const playerDoc = await User.findById(targetPlayerId)
        .select("selectTeam")
        .lean();
      if (playerDoc?.selectTeam) {
        targetTeamId = playerDoc.selectTeam.toString();
      }
    }
  }

  if (targetTeamId && !mongoose.Types.ObjectId.isValid(targetTeamId)) {
    return [];
  }

  const filter: Record<string, any> = {};

  const targetId = leagueId || id || _id;
  if (targetId) {
    if (mongoose.Types.ObjectId.isValid(targetId)) {
      filter._id = targetId;
    } else {
      return [];
    }
  }

  if (targetTeamId) {
    const targetTeamObjId = new mongoose.Types.ObjectId(
      targetTeamId.toString(),
    );

    const [ltLeagues, matchLeagues, directTeam] = await Promise.all([
      LeagueTeam.find({
        team: { $in: [targetTeamObjId, targetTeamId] },
      }).distinct("league"),
      Match.find({
        $or: [
          { homeTeam: { $in: [targetTeamObjId, targetTeamId] } },
          { awayTeam: { $in: [targetTeamObjId, targetTeamId] } },
        ],
      }).distinct("league"),
      Team.findById(targetTeamId).select("league").lean(),
    ]);

    const candidateLeagues = [
      ...(ltLeagues || []),
      ...(matchLeagues || []),
      ...((directTeam as any)?.league ? [(directTeam as any).league] : []),
    ]
      .filter(Boolean)
      .map((lId: any) => lId.toString());

    const uniqueCandidateLeagues = Array.from(new Set(candidateLeagues));

    if (uniqueCandidateLeagues.length === 0) {
      return [];
    }

    if (filter._id) {
      const existingId = filter._id.toString();
      if (!uniqueCandidateLeagues.includes(existingId)) {
        return [];
      }
    } else {
      filter._id = {
        $in: uniqueCandidateLeagues.map(
          (lId) => new mongoose.Types.ObjectId(lId),
        ),
      };
    }
  }

  if (season) {
    const escapedSeason = season
      .toString()
      .replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
    const pattern = escapedSeason.trim().replace(/\s+/g, "\\s+");
    filter.season = { $regex: new RegExp(`^\\s*${pattern}\\s*$`, "i") };
  }

  if (leagueName) {
    const escapedLeagueName = leagueName
      .toString()
      .replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
    const pattern = escapedLeagueName.trim().replace(/\s+/g, "\\s+");
    filter.leagueName = { $regex: new RegExp(pattern, "i") };
  }

  if (year) {
    const escapedYear = year
      .toString()
      .replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
    const pattern = escapedYear.trim().replace(/\s+/g, "\\s+");
    filter.season = { $regex: new RegExp(pattern, "i") };
  }

  const leagues = await League.find(filter).sort({ createdAt: -1 });
  if (!leagues.length) {
    return [];
  }

  const leagueIds = leagues.map((l) => l._id);

  const [allLeagueTeams, directTeamsInLeague, allMatches] = await Promise.all([
    LeagueTeam.find({ league: { $in: leagueIds } }).populate(
      "team",
      "teamName shortName teamLogo",
    ),
    Team.find({ league: { $in: leagueIds } }).select(
      "teamName shortName teamLogo league",
    ),
    Match.find({ league: { $in: leagueIds }, status: "finished" }),
  ]);

  const leagueTeamsMap: Record<string, any[]> = {};
  for (const lt of allLeagueTeams) {
    const lId = lt.league?.toString();
    if (lId) {
      if (!leagueTeamsMap[lId]) leagueTeamsMap[lId] = [];
      leagueTeamsMap[lId].push(lt);
    }
  }

  for (const t of directTeamsInLeague) {
    const lId = (t as any).league?.toString();
    if (lId) {
      if (!leagueTeamsMap[lId]) leagueTeamsMap[lId] = [];
      const alreadyIn = leagueTeamsMap[lId].some(
        (lt) => (lt.team?._id || lt.team)?.toString() === t._id.toString(),
      );
      if (!alreadyIn) {
        leagueTeamsMap[lId].push({ league: lId, team: t });
      }
    }
  }

  const matchesMap: Record<string, any[]> = {};
  for (const match of allMatches) {
    const lId = match.league?.toString();
    if (lId) {
      if (!matchesMap[lId]) matchesMap[lId] = [];
      matchesMap[lId].push(match);
    }
  }

  // Pre-fetch team players if teamId or playerId is provided
  let teamPlayers: any[] = [];
  if (targetTeamId) {
    const teamObjectId = new mongoose.Types.ObjectId(targetTeamId.toString());
    const activeSubUserIds = await Subscription.find({
      status: "active",
    }).distinct("user");

    const playerFilter: any = {
      selectTeam: { $in: [teamObjectId, targetTeamId.toString()] },
      role: {
        $in: [
          USER_ROLES.PLAYER,
          USER_ROLES.OTHER_CLUBS,
          USER_ROLES.TOURNAMENT_PLAYER,
        ],
      },
      status: { $ne: "REJECTED" },
    };

    if (targetPlayerId && mongoose.Types.ObjectId.isValid(targetPlayerId)) {
      playerFilter._id = new mongoose.Types.ObjectId(targetPlayerId.toString());
    }

    const rawPlayers = await User.find(playerFilter)
      .select(
        "_id firstName lastName userName profile position ageGroup dateOfBirth selectTeam status emergencyEmail emergencyPhone role jerseyNumber engCoine marketValue",
      )
      .lean();

    const playerIds = rawPlayers.map((p) => p._id);
    const statsMap = await getBatchPlayerStatsSummary(playerIds);

    teamPlayers = rawPlayers.map((p: any) => {
      const stats = statsMap.get(p._id.toString()) || {
        goals: 0,
        assists: 0,
        cleanSheets: 0,
        playerOfTheDay: 0,
        yellowCards: 0,
        redCards: 0,
        totalMatches: 0,
        matchesPlayed: 0,
      };

      return {
        _id: p._id,
        userId: p._id,
        firstName: p.firstName || null,
        lastName: p.lastName || null,
        userName:
          p.userName ||
          (p.firstName
            ? `${p.firstName} ${p.lastName || ""}`.trim()
            : "Player"),
        profile: p.profile || null,
        position: p.position || "BENCH",
        ageGroup: p.ageGroup || null,
        dateOfBirth: p.dateOfBirth || null,
        status: p.status || "APPROVED",
        jerseyNumber: p.jerseyNumber || null,
        engCoine: p.engCoine || 0,
        marketValue: p.marketValue || 0,
        role: p.role,
        stats,
      };
    });
  }

  const response = [];

  for (const league of leagues) {
    const lId = league._id.toString();
    const leagueTeams = leagueTeamsMap[lId] || [];
    const matches = matchesMap[lId] || [];

    let standings = computeStandings(leagueTeams, matches);

    if (targetTeamId) {
      standings = standings
        .filter((item: any) => {
          const itemTeamId = (item.team?._id || item.team)?.toString();
          return itemTeamId === targetTeamId.toString();
        })
        .map((item: any) => ({
          ...item,
          players: teamPlayers,
          team: {
            ...(item.team?.toObject ? item.team.toObject() : item.team),
            players: teamPlayers,
          },
        }));

      if (standings.length === 0) {
        continue;
      }

      response.push({
        league,
        standings,
        players: teamPlayers,
      });
    } else {
      response.push({
        league,
        standings,
      });
    }
  }

  // Handle pagination (page & limit) if passed
  const parsedLimit = Number(limit);
  const parsedPage = Number(page) || 1;

  if (parsedLimit && parsedLimit > 0) {
    const skip = (parsedPage - 1) * parsedLimit;
    return response.slice(skip, skip + parsedLimit);
  }
  return response;
};

export const PointTableService = {
  getPointTable,
};
