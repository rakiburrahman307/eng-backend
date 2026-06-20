import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiErrors';
import { ManagerTeam } from './managerTeam.model';
import { User } from '../user/user.model';
import { Team } from '../team/team.model';

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


export const ManagerTeamService = {
  assignManagerToTeamToDB,
  getAllManagerTeamsFromDB,
  removeManagerFromTeamFromDB,
  getMyTeamsFromDB
};