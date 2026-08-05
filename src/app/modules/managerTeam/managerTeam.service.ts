import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiErrors';
import { ManagerTeam } from './managerTeam.model';
import { User } from '../user/user.model';
import { Team } from '../team/team.model';
import { USER_ROLES } from '../../../enums/user';

// ASSIGN MANAGER TO TEAM
const assignManagerToTeamToDB = async (
  payload: any,
  adminId: string
) => {
  const { manager, team } = payload;

  // Check manager exists
  const managerUser = await User.findById(manager);

  if (!managerUser) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Manager not found');
  }

  // Check team exists
  const teamData = await Team.findById(team);

  if (!teamData) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Team not found');
  }

  // Create if not exists, otherwise replace manager
  const result = await ManagerTeam.findOneAndUpdate(
    { team },
    {
      manager,
      team,
    },
    {
      new: true,
      upsert: true,
      runValidators: true,
    }
  );

  return result;
};

// GET ALL
const getAllManagerTeamsFromDB = async () => {
  const result = await ManagerTeam.find()
    .populate('manager')
    .populate('team');

  return result;
};

// REMOVE
const removeManagerFromTeamFromDB = async (id: string) => {
  const data = await ManagerTeam.findById(id);

  if (!data) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'ManagerTeam not found');
  }

  await ManagerTeam.findByIdAndDelete(id);

  return data;
};

const removeManagerFromTeamByTeamIdFromDB = async (teamId: string) => {
  const data = await ManagerTeam.findOne({ team: teamId });
  if (data) {
    await ManagerTeam.deleteOne({ team: teamId });
  }
  return data;
};


const getMyTeamsFromDB = async (managerId: string) => {
  const teams = await ManagerTeam.find({
    manager: managerId,
  })
    .populate({
      path: 'team',
    //   populate: {
    //     path: 'club',
    //   },
    });

  return teams;
};


const bulkAssignTeamsToManagerInDB = async (payload: { manager: string; teams?: string | string[]; team?: string }) => {
  const { manager, teams, team } = payload;

  const managerUser = await User.findById(manager);
  if (!managerUser) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Manager not found');
  }

  // Normalize inputs to support array, single string, or single 'team' property
  let teamList: string[] = [];
  if (teams) {
    teamList = Array.isArray(teams) ? teams : [teams];
  } else if (team) {
    teamList = [team];
  }

  // Clear existing mappings for this manager
  await ManagerTeam.deleteMany({ manager });

  if (teamList.length > 0) {
    // Verify teams exist
    const teamsExistCount = await Team.countDocuments({ _id: { $in: teamList } });
    if (teamsExistCount !== teamList.length) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'One or more team IDs are invalid');
    }

    // Clear existing manager assignments from these teams (only 1 manager per team)
    await ManagerTeam.deleteMany({ team: { $in: teamList } });

    // Create the assignments
    const mappings = teamList.map((teamId) => ({
      manager,
      team: teamId,
    }));

    await ManagerTeam.insertMany(mappings);
  }

  return { success: true, message: 'Teams assigned to manager successfully' };
};

const bulkRemoveTeamsFromManagerInDB = async (payload: { manager: string; teams?: string | string[]; team?: string }) => {
  const { manager, teams, team } = payload;

  const managerUser = await User.findById(manager);
  if (!managerUser) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Manager not found');
  }

  let teamList: string[] = [];
  if (teams) {
    teamList = Array.isArray(teams) ? teams : [teams];
  } else if (team) {
    teamList = [team];
  }

  const query: Record<string, any> = { manager };

  if (teamList.length > 0) {
    query.team = { $in: teamList };
  }

  await ManagerTeam.deleteMany(query);

  return { success: true, message: 'Teams removed from manager successfully' };
};

export const ManagerTeamService = {
  assignManagerToTeamToDB,
  getAllManagerTeamsFromDB,
  removeManagerFromTeamFromDB,
  removeManagerFromTeamByTeamIdFromDB,
  getMyTeamsFromDB,
  bulkAssignTeamsToManagerInDB,
  bulkRemoveTeamsFromManagerInDB,
};