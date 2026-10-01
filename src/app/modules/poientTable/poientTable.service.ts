import { League } from "../league/league.model";
import { LeagueTeam } from "../leagueTeam/leagueTeam.model";
import { Match } from "../match/match.model";
import { Team } from "../team/team.model";
import { User } from "../user/user.model";
import { PointTable } from "./poientTable.model";
import mongoose from "mongoose";
import ApiError from "../../../errors/ApiErrors";
import { StatusCodes } from "http-status-codes";

// Helper to match age group flexibly (e.g., 'u12', 'U12', 'Under 12', '12')
const isAgeGroupMatch = (
  teamOrMatchAge?: string | null,
  targetAge?: string | null
): boolean => {
  if (!teamOrMatchAge || !targetAge) return false;
  const t = teamOrMatchAge.toString().trim().toLowerCase();
  const q = targetAge.toString().trim().toLowerCase();
  if (t === q) return true;
  const normT = t.replace(/^(u|under)[-\s]*/i, "u");
  const normQ = q.replace(/^(u|under)[-\s]*/i, "u");
  if (normT === normQ) return true;
  const numT = t.match(/\d+/)?.[0];
  const numQ = q.match(/\d+/)?.[0];
  if (numT && numQ && numT === numQ) return true;
  return false;
};

// Helper to calculate standings synchronously from prefetched teams & matches & manual overrides
const computeStandings = (
  leagueTeams: any[],
  matches: any[],
  manualOverrides: any[] = [],
  targetAgeGroup?: string
) => {
  let effectiveLeagueTeams = leagueTeams;
  let effectiveOverrides = manualOverrides;
  let effectiveMatches = matches;

  if (targetAgeGroup) {
    // 1. Filter teams that match targetAgeGroup (or participated in matching matches)
    effectiveLeagueTeams = leagueTeams.filter((lt) => {
      const teamAge = lt.team?.ageGroup;
      if (isAgeGroupMatch(teamAge, targetAgeGroup)) return true;
      const tId = (lt.team?._id || lt.team)?.toString();
      if (!tId) return false;
      return matches.some(
        (m) =>
          isAgeGroupMatch(m.ageGroup, targetAgeGroup) &&
          (m.homeTeam?.toString() === tId || m.awayTeam?.toString() === tId)
      );
    });

    // 2. Filter overrides that match targetAgeGroup
    effectiveOverrides = manualOverrides.filter((mo) => {
      const teamAge = mo.team?.ageGroup;
      if (isAgeGroupMatch(teamAge, targetAgeGroup)) return true;
      const tId = (mo.team?._id || mo.team)?.toString();
      if (!tId) return false;
      return matches.some(
        (m) =>
          isAgeGroupMatch(m.ageGroup, targetAgeGroup) &&
          (m.homeTeam?.toString() === tId || m.awayTeam?.toString() === tId)
      );
    });

    // 3. Filter matches relevant to target age group
    const teamIdSet = new Set(
      effectiveLeagueTeams
        .map((lt) => (lt.team?._id || lt.team)?.toString())
        .filter(Boolean)
    );

    effectiveMatches = matches.filter((m) => {
      if (m.ageGroup && !isAgeGroupMatch(m.ageGroup, targetAgeGroup)) {
        return false;
      }
      if (m.ageGroup && isAgeGroupMatch(m.ageGroup, targetAgeGroup)) {
        return true;
      }
      const homeId = m.homeTeam?.toString();
      const awayId = m.awayTeam?.toString();
      return (homeId && teamIdSet.has(homeId)) || (awayId && teamIdSet.has(awayId));
    });
  }

  // Sort matches chronologically
  const sortedMatches = [...effectiveMatches].sort((a, b) => {
    const dateA = new Date(a.matchDate || a.createdAt || 0).getTime();
    const dateB = new Date(b.matchDate || b.createdAt || 0).getTime();
    return dateA - dateB;
  });

  // Map manual overrides by teamId
  const overrideMap: Record<string, any> = {};
  for (const mo of effectiveOverrides) {
    const tId = (mo.team?._id || mo.team)?.toString();
    if (tId) {
      overrideMap[tId] = mo;
    }
  }

  // Helper to build raw table from given match list
  const buildRawTable = (matchList: any[], applyOverrides: boolean = false) => {
    const table: Record<string, any> = {};

    for (const lt of effectiveLeagueTeams) {
      if (!lt.team) continue;
      const team: any = lt.team;
      const teamId = team._id.toString();

      table[teamId] = {
        team,
        played: 0,
        win: 0,
        draw: 0,
        loss: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0,
        points: 0,
        isManual: false,
      };
    }

    // Include teams that exist in manual overrides even if not yet in leagueTeams
    if (applyOverrides) {
      for (const [tId, mo] of Object.entries(overrideMap)) {
        if (!table[tId] && (mo.team?._id || mo.team)) {
          table[tId] = {
            team: mo.team,
            played: 0,
            win: 0,
            draw: 0,
            loss: 0,
            goalsFor: 0,
            goalsAgainst: 0,
            goalDifference: 0,
            points: 0,
            isManual: true,
          };
        }
      }
    }

    // Initialize base values: If team has an override and applyOverrides is true, start from override base!
    if (applyOverrides) {
      for (const teamId in table) {
        if (overrideMap[teamId]) {
          const mo = overrideMap[teamId];
          table[teamId].played = Number(mo.played ?? 0);
          table[teamId].win = Number(mo.win ?? 0);
          table[teamId].draw = Number(mo.draw ?? 0);
          table[teamId].loss = Number(mo.loss ?? 0);
          table[teamId].goalsFor = Number(mo.goalsFor ?? 0);
          table[teamId].goalsAgainst = Number(mo.goalsAgainst ?? 0);
          table[teamId].goalDifference =
            mo.goalDifference !== undefined
              ? Number(mo.goalDifference)
              : table[teamId].goalsFor - table[teamId].goalsAgainst;
          table[teamId].points = Number(mo.points ?? 0);
          table[teamId].isManual = true;
          table[teamId]._pointTableId = mo._id?.toString();
        }
      }
    }

    // Process matches:
    for (const match of matchList) {
      const matchId = match._id?.toString();
      const homeId = match.homeTeam?.toString();
      const awayId = match.awayTeam?.toString();

      const homeScore = match.homeScore || 0;
      const awayScore = match.awayScore || 0;

      // Determine if this match was already part of the base edit
      const homeOverride = applyOverrides ? overrideMap[homeId] : null;
      const homeAlreadyInBase =
        homeOverride?.baseMatchIds &&
        homeOverride.baseMatchIds.some((id: any) => id.toString() === matchId);

      const awayOverride = applyOverrides ? overrideMap[awayId] : null;
      const awayAlreadyInBase =
        awayOverride?.baseMatchIds &&
        awayOverride.baseMatchIds.some((id: any) => id.toString() === matchId);

      // 1. Home Team calculation (only if not already baked into base edit)
      if (table[homeId] && !homeAlreadyInBase) {
        table[homeId].played++;
        table[homeId].goalsFor += homeScore;
        table[homeId].goalsAgainst += awayScore;

        if (homeScore > awayScore) {
          table[homeId].win++;
          table[homeId].points += 3;
        } else if (homeScore < awayScore) {
          table[homeId].loss++;
        } else {
          table[homeId].draw++;
          table[homeId].points += 1;
        }
      }

      // 2. Away Team calculation (only if not already baked into base edit)
      if (table[awayId] && !awayAlreadyInBase) {
        table[awayId].played++;
        table[awayId].goalsFor += awayScore;
        table[awayId].goalsAgainst += homeScore;

        if (awayScore > homeScore) {
          table[awayId].win++;
          table[awayId].points += 3;
        } else if (awayScore < homeScore) {
          table[awayId].loss++;
        } else {
          table[awayId].draw++;
          table[awayId].points += 1;
        }
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

  // 1. Current Full Standings (with manual overrides + new subsequent matches applied)
  const currentStandings = buildRawTable(sortedMatches, true);

  // 2. Previous Standings (before last match) to determine trend (UP/DOWN/SAME)
  const prevMatches =
    sortedMatches.length > 0
      ? sortedMatches.slice(0, sortedMatches.length - 1)
      : [];
  const prevStandings = buildRawTable(prevMatches, false);

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
const calculateLeague = async (league: any, targetAgeGroup?: string) => {
  const leagueId = league._id.toString();

  const [leagueTeams, matches, overrides] = await Promise.all([
    LeagueTeam.find({ league: leagueId }).populate(
      "team",
      "teamName shortName teamLogo ageGroup",
    ),
    Match.find({
      league: leagueId,
      status: "finished",
      matchType: { $nin: ["friendly", "cup"] },
    }),
    PointTable.find({ league: leagueId }).populate(
      "team",
      "teamName shortName teamLogo ageGroup",
    ),
  ]);

  return computeStandings(leagueTeams, matches, overrides, targetAgeGroup);
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
    ageGroup,
    age_group,
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

  // Parse and sanitize optional ageGroup
  const rawAgeGroup = ageGroup || age_group;
  const targetAgeGroup =
    rawAgeGroup &&
    typeof rawAgeGroup === "string" &&
    rawAgeGroup.trim() !== "" &&
    rawAgeGroup.trim().toUpperCase() !== "ALL" &&
    rawAgeGroup.trim().toLowerCase() !== "null" &&
    rawAgeGroup.trim().toLowerCase() !== "undefined"
      ? rawAgeGroup.trim()
      : undefined;

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

  // If ageGroup is provided, narrow down candidate leagues
  if (targetAgeGroup) {
    const cleanAge = targetAgeGroup.trim();
    const numPart = cleanAge.match(/\d+/)?.[0];
    const ageRegex = numPart
      ? new RegExp(`(u|under|\\b)${numPart}\\b`, "i")
      : new RegExp(cleanAge.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&"), "i");

    const matchingTeams = await Team.find({ ageGroup: { $regex: ageRegex } })
      .select("_id league")
      .lean();
    const teamIds = matchingTeams.map((t) => t._id);

    const [ltLeagues, matchLeagues] = await Promise.all([
      LeagueTeam.find({ team: { $in: teamIds } }).distinct("league"),
      Match.find({
        $or: [
          { ageGroup: { $regex: ageRegex } },
          { homeTeam: { $in: teamIds } },
          { awayTeam: { $in: teamIds } },
        ],
      }).distinct("league"),
    ]);

    const directLeagues = matchingTeams
      .map((t: any) => t.league)
      .filter(Boolean);

    const candidateLeagueIds = Array.from(
      new Set(
        [...ltLeagues, ...matchLeagues, ...directLeagues]
          .filter(Boolean)
          .map((lid: any) => lid.toString()),
      ),
    ).map((lid: any) => new mongoose.Types.ObjectId(lid));

    if (candidateLeagueIds.length === 0) {
      return [];
    }

    if (filter._id) {
      const currentIds = Array.isArray(filter._id.$in)
        ? filter._id.$in.map((lid: any) => lid.toString())
        : [filter._id.toString()];
      const intersected = currentIds.filter((lid: string) =>
        candidateLeagueIds.some((cid) => cid.toString() === lid),
      );
      if (intersected.length === 0) {
        return [];
      }
      filter._id = {
        $in: intersected.map((lid: string) => new mongoose.Types.ObjectId(lid)),
      };
    } else {
      filter._id = { $in: candidateLeagueIds };
    }
  }

  // Season is completely OPTIONAL. Only filter if a valid, non-empty season string is provided.
  if (
    season &&
    typeof season === "string" &&
    season.trim() !== "" &&
    season.trim().toUpperCase() !== "ALL" &&
    season.trim().toLowerCase() !== "null" &&
    season.trim().toLowerCase() !== "undefined"
  ) {
    const escapedSeason = season
      .toString()
      .trim()
      .replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
    const pattern = escapedSeason.replace(/\s+/g, "\\s+");
    filter.season = { $regex: new RegExp(`^\\s*${pattern}\\s*$`, "i") };
  }

  if (leagueName) {
    const escapedLeagueName = leagueName
      .toString()
      .replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
    const pattern = escapedLeagueName.trim().replace(/\s+/g, "\\s+");
    filter.leagueName = { $regex: new RegExp(pattern, "i") };
  }

  if (
    year &&
    typeof year === "string" &&
    year.trim() !== "" &&
    year.trim().toUpperCase() !== "ALL"
  ) {
    const escapedYear = year
      .toString()
      .trim()
      .replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
    const pattern = escapedYear.replace(/\s+/g, "\\s+");
    filter.season = { $regex: new RegExp(pattern, "i") };
  }

  const leagues = await League.find(filter).sort({ createdAt: -1 });
  if (!leagues.length) {
    return [];
  }

  const leagueIds = leagues.map((l) => l._id);

  const [allLeagueTeams, directTeamsInLeague, allMatches, allPointTableOverrides] =
    await Promise.all([
      LeagueTeam.find({ league: { $in: leagueIds } }).populate(
        "team",
        "teamName shortName teamLogo ageGroup",
      ),
      Team.find({ league: { $in: leagueIds } }).select(
        "teamName shortName teamLogo ageGroup league",
      ),
      Match.find({ league: { $in: leagueIds }, status: "finished" }),
      PointTable.find({ league: { $in: leagueIds } }).populate(
        "team",
        "teamName shortName teamLogo ageGroup",
      ),
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

  const pointTableOverridesMap: Record<string, any[]> = {};
  for (const pto of allPointTableOverrides) {
    const lId = pto.league?.toString();
    if (lId) {
      if (!pointTableOverridesMap[lId]) pointTableOverridesMap[lId] = [];
      pointTableOverridesMap[lId].push(pto);
    }
  }

  const response = [];

  for (const league of leagues) {
    const lId = league._id.toString();
    const leagueTeams = leagueTeamsMap[lId] || [];
    const matches = matchesMap[lId] || [];
    const overrides = pointTableOverridesMap[lId] || [];

    const standings = computeStandings(
      leagueTeams,
      matches,
      overrides,
      targetAgeGroup,
    );

    // If targetAgeGroup is passed, skip leagues with no matching standings
    if (targetAgeGroup && standings.length === 0) {
      continue;
    }

    // If targetTeamId is passed, ensure this league contains the target team
    if (targetTeamId) {
      const teamInLeague = standings.some((item: any) => {
        const itemTeamId = (item.team?._id || item.team)?.toString();
        return itemTeamId === targetTeamId.toString();
      });

      if (!teamInLeague) {
        continue;
      }
    }

    response.push({
      league,
      standings,
    });
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

// =========================
// UPDATE / UPSERT MANUAL STANDING (OPTION 2: INCREMENTAL BASE)
// =========================
const updateSinglePointTable = async (payload: {
  league: string;
  team: string;
  played?: number;
  win?: number;
  draw?: number;
  loss?: number;
  goalsFor?: number;
  goalsAgainst?: number;
  goalDifference?: number;
  points?: number;
}) => {
  const { league, team, ...stats } = payload;
  if (!league || !team) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "League and Team IDs are required");
  }

  // Find all currently finished matches in this league for this team up to this moment
  const finishedMatches = await Match.find({
    league,
    status: "finished",
    $or: [{ homeTeam: team }, { awayTeam: team }],
  }).select("_id");

  const baseMatchIds = finishedMatches.map((m) => m._id);

  const goalsFor = stats.goalsFor !== undefined ? Number(stats.goalsFor) : 0;
  const goalsAgainst = stats.goalsAgainst !== undefined ? Number(stats.goalsAgainst) : 0;
  const goalDifference =
    stats.goalDifference !== undefined
      ? Number(stats.goalDifference)
      : goalsFor - goalsAgainst;

  const win = stats.win !== undefined ? Number(stats.win) : 0;
  const draw = stats.draw !== undefined ? Number(stats.draw) : 0;
  const loss = stats.loss !== undefined ? Number(stats.loss) : 0;
  const played =
    stats.played !== undefined ? Number(stats.played) : win + draw + loss;
  const points =
    stats.points !== undefined ? Number(stats.points) : win * 3 + draw;

  const updateData = {
    league,
    team,
    played,
    win,
    draw,
    loss,
    goalsFor,
    goalsAgainst,
    goalDifference,
    points,
    isManual: true,
    baseMatchIds,
    overrideAt: new Date(),
  };

  const result = await PointTable.findOneAndUpdate(
    { league, team },
    { $set: updateData },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).populate("team", "teamName shortName teamLogo ageGroup");

  return result;
};

const updatePointTable = async (payload: any) => {
  if (Array.isArray(payload)) {
    const results = [];
    for (const item of payload) {
      results.push(await updateSinglePointTable(item));
    }
    return results;
  }
  return await updateSinglePointTable(payload);
};

// =========================
// RESET MANUAL STANDING TO AUTO-CALC
// =========================
const resetPointTable = async (payload: { league: string; team: string }) => {
  const { league, team } = payload;
  if (!league || !team) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "League and Team IDs are required");
  }
  const result = await PointTable.findOneAndDelete({ league, team });
  return result;
};

// =========================
// POINT TABLE OVERVIEW & ANALYTICS
// =========================
const getPointTableOverview = async (query: Record<string, any>) => {
  const { leagueId } = query;

  const [totalLeagues, totalClubs, matchesPlayed, totalMatches, goalsAgg, manualOverrides] =
    await Promise.all([
      League.countDocuments(),
      leagueId
        ? LeagueTeam.countDocuments({ league: leagueId })
        : LeagueTeam.countDocuments(),
      Match.countDocuments({
        ...(leagueId ? { league: leagueId } : {}),
        status: "finished",
      }),
      Match.countDocuments(leagueId ? { league: leagueId } : {}),
      Match.aggregate([
        {
          $match: {
            ...(leagueId ? { league: new mongoose.Types.ObjectId(leagueId) } : {}),
            status: "finished",
          },
        },
        {
          $group: {
            _id: null,
            totalGoals: {
              $sum: { $add: ["$homeScore", "$awayScore"] },
            },
          },
        },
      ]),
      PointTable.countDocuments({
        ...(leagueId ? { league: leagueId } : {}),
        isManual: true,
      }),
    ]);

  const totalGoals = goalsAgg[0]?.totalGoals || 0;
  const avgGoalsPerMatch =
    matchesPlayed > 0 ? Number((totalGoals / matchesPlayed).toFixed(2)) : 0;

  return {
    totalLeagues,
    totalClubs,
    matchesPlayed,
    totalMatches,
    totalGoals,
    manualOverrides,
    avgGoalsPerMatch,
  };
};

export const PointTableService = {
  getPointTable,
  getPointTableOverview,
  calculateLeague,
  updatePointTable,
  resetPointTable,
};
