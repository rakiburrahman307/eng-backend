import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiErrors';
import { League } from '../league/league.model';
import { Team } from '../team/team.model';
import { ILeagueTeam } from './leagueTeam.interface';
import { LeagueTeam } from './leagueTeam.model';

// ADD TEAM
const addTeamToLeagueToDB = async (payload: {
  league: string;
  teams: string[];
}) => {
  const { league, teams } = payload;

  // 1. check league exists
  const leagueExists = await League.findById(league);
  if (!leagueExists) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'League not found');
  }

  // 2. check all teams exist
  const existingTeams = await Team.find({ _id: { $in: teams } });

  if (existingTeams.length !== teams.length) {
    throw new ApiError(
      StatusCodes.NOT_FOUND,
      'One or more teams not found'
    );
  }

  // 3. prepare bulk operations
  const operations = teams.map((team) => ({
    updateOne: {
      filter: { league, team },
      update: { league, team },
      upsert: true, // create if not exists, update if exists
    },
  }));

  // 4. execute bulk write
  const result = await LeagueTeam.bulkWrite(operations);

  return result;
};

// GET ALL
const getLeagueTeamsFromDB = async (
  query: Record<string, any>
) => {
  const filter: any = {};

  if (query.league) {
    filter.league = query.league;
  }

  const result = await LeagueTeam.find(filter)
    .populate('league')
    .populate('team');

  return result;
};

// REMOVE
const removeTeamFromLeagueToDB = async (
  id: string
) => {
  const leagueTeam = await LeagueTeam.findById(id);

  if (!leagueTeam) {
    throw new ApiError(
      StatusCodes.NOT_FOUND,
      'League team not found'
    );
  }

  return await LeagueTeam.findByIdAndDelete(id);
};


const getTeamsByLeagueFromDB = async (leagueId: string) => {
    const data = await LeagueTeam.find({ league: leagueId })
    .populate('league') 
    .populate('team');

  if (!data.length) {
    return {
      league: null,
      teams: [],
    };
  }

  return {
    league: data[0].league, // same for all rows
    teams: data.map((item) => item.team),
  };
};

const removeSingleTeamFromLeague = async (
  leagueId: string,
  teamId: string
) => {
  const deleted = await LeagueTeam.findOneAndDelete({
    league: leagueId,
    team: teamId,
  });

  if (!deleted) {
    throw new ApiError(
      StatusCodes.NOT_FOUND,
      'Team not found in this league'
    );
  }

  return deleted;
};

export const LeagueTeamService = {
  addTeamToLeagueToDB,
  getLeagueTeamsFromDB,
  removeTeamFromLeagueToDB,
  getTeamsByLeagueFromDB,
  removeSingleTeamFromLeague
};