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

// =========================
// SINGLE LEAGUE CALC
// =========================
const calculateLeague = async (league: any) => {
  const leagueId = league._id.toString();

  const leagueTeams = await LeagueTeam.find({ league: leagueId })
    .populate('team', 'teamName shortName teamLogo');

  const matches = await Match.find({
    league: leagueId,
    status: 'finished',
  });

  const table: any = {};

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

  const result = Object.values(table);

  // // fallback demo
  // if (!result.length) {
  //   return demoStandings;
  // }

  return result;
};

// =========================
// GROUPED RESPONSE
// =========================
const getAllLeaguesGrouped = async () => {
  const leagues = await League.find();

  const response = [];

  for (const league of leagues) {
    const standings = await calculateLeague(league);

    response.push({
      league,
      standings,
    });
  }

  return response;
};

// =========================
// MAIN API
// =========================
const getPointTable = async (leagueId?: string) => {
  if (leagueId) {
    const league = await League.findById(leagueId);
    if (!league) return [];

    const standings = await calculateLeague(league);

    return [
      {
        league,
        standings,
      },
    ];
  }

  return getAllLeaguesGrouped();
};

export const PointTableService = {
  getPointTable,
};