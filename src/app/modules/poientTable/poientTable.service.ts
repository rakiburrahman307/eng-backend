import { League } from '../league/league.model';
import { LeagueTeam } from '../leagueTeam/leagueTeam.model';
import { Match } from '../match/match.model';

const demoStandings = [
  {
    team: {
      _id: 'demo1',
      teamName: 'Demo FC',
      shortName: 'DFC',
      teamLogo: '',
    },
    played: 3,
    win: 2,
    draw: 1,
    loss: 0,
    goalsFor: 5,
    goalsAgainst: 2,
    goalDifference: 3,
    points: 7,
  },
  {
    team: {
      _id: 'demo2',
      teamName: 'Mock United',
      shortName: 'MU',
      teamLogo: '',
    },
    played: 3,
    win: 1,
    draw: 1,
    loss: 1,
    goalsFor: 3,
    goalsAgainst: 4,
    goalDifference: -1,
    points: 4,
  },
];

// Helper to calculate standings synchronously from prefetched teams & matches
const computeStandings = (leagueTeams: any[], matches: any[]) => {
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

  for (const match of matches) {
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

  return Object.values(table);
};

// =========================
// SINGLE LEAGUE CALC
// =========================
const calculateLeague = async (league: any) => {
  const leagueId = league._id.toString();

  const [leagueTeams, matches] = await Promise.all([
    LeagueTeam.find({ league: leagueId }).populate(
      'team',
      'teamName shortName teamLogo'
    ),
    Match.find({
      league: leagueId,
      status: 'finished',
    }),
  ]);

  return computeStandings(leagueTeams, matches);
};

import mongoose from 'mongoose';

// =========================
// MAIN API (WITH STRICT FILTERING BY QUERY)
// =========================
const getPointTable = async (query: Record<string, any> = {}) => {
  const { leagueId, id, _id, season, leagueName, year, page, limit } = query;

  const filter: Record<string, any> = {};

  const targetId = leagueId || id || _id;
  if (targetId) {
    if (mongoose.Types.ObjectId.isValid(targetId)) {
      filter._id = targetId;
    } else {
      // Invalid ObjectId format means no match exists
      return [];
    }
  }

  if (season) {
    console.log(season)
    const escapedSeason = season.toString().replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const pattern = escapedSeason.trim().replace(/\s+/g, '\\s+');
    filter.season = { $regex: new RegExp(`^${pattern}$`, 'i') };
  }

  if (leagueName) {
    const escapedLeagueName = leagueName.toString().replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const pattern = escapedLeagueName.trim().replace(/\s+/g, '\\s+');
    filter.leagueName = { $regex: new RegExp(pattern, 'i') };
  }

  if (year) {
    const escapedYear = year.toString().replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const pattern = escapedYear.trim().replace(/\s+/g, '\\s+');
    filter.season = { $regex: new RegExp(pattern, 'i') };
  }

  // Fetch only leagues matching the filter criteria
  const leagues = await League.find(filter).sort({ createdAt: -1 });

  // If no league matches the filter (e.g. season=2022 doesn't match), return [] empty array!
  if (!leagues.length) {
    return [];
  }

  const leagueIds = leagues.map((l) => l._id);

  const [allLeagueTeams, allMatches] = await Promise.all([
    LeagueTeam.find({ league: { $in: leagueIds } }).populate(
      'team',
      'teamName shortName teamLogo'
    ),
    Match.find({ league: { $in: leagueIds }, status: 'finished' }),
  ]);

  const leagueTeamsMap: Record<string, any[]> = {};
  for (const lt of allLeagueTeams) {
    const lId = lt.league?.toString();
    if (lId) {
      if (!leagueTeamsMap[lId]) leagueTeamsMap[lId] = [];
      leagueTeamsMap[lId].push(lt);
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

  const response = [];

  for (const league of leagues) {
    const lId = league._id.toString();
    const leagueTeams = leagueTeamsMap[lId] || [];
    const matches = matchesMap[lId] || [];

    const standings = computeStandings(leagueTeams, matches);

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

export const PointTableService = {
  getPointTable,
};