import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiErrors';
import { ManagerTeam } from './managerTeam.model';
import { User } from '../user/user.model';
import { Team } from '../team/team.model';

// ASSIGN MANAGER TO TEAM
const assignManagerToTeamToDB = async (payload: any, adminId: string) => {
  const { manager, team } = payload;

  // check manager user exists
  const managerUser = await User.findById(manager);

  if (!managerUser) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Manager not found');
  }

  // check team exists
  const teamData = await Team.findById(team);

  if (!teamData) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Team not found');
  }

  // check duplicate
  const alreadyExists = await ManagerTeam.findOne({
    manager,
    team,
  });

  if (alreadyExists) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Manager already assigned to this team'
    );
  }

  const result = await ManagerTeam.create({
    manager,
    team,
  });

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

export const ManagerTeamService = {
  assignManagerToTeamToDB,
  getAllManagerTeamsFromDB,
  removeManagerFromTeamFromDB,
};