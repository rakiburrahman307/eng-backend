import QueryBuilder from '../../../util/queryBilter';
import { Team } from './team.model';
import { UserDetails } from '../user/userDetails.model';
import { ManagerTeam } from '../managerTeam/managerTeam.model';

// CREATE TEAM
const createTeamToDB = async (payload: any) => {
  return await Team.create(payload);
};

// GET ALL TEAMS
const getAllTeamsFromDB = async (query: Record<string, any>) => {
  const teamQuery = new QueryBuilder(Team.find(), query)
    .search(['teamName', 'shortName', 'city', 'country'])
    .filter()
    .sort()
    .paginate()
    .fields();

  const teams = await teamQuery.modelQuery;
  const meta = await teamQuery.getPaginationInfo();

  const teamIds = teams.map((t) => t._id);

  // 👥 players count
  const memberCounts = await UserDetails.aggregate([
    {
      $match: { selectTeam: { $in: teamIds } },
    },
    {
      $group: {
        _id: '$selectTeam',
        totalMembers: { $sum: 1 },
      },
    },
  ]);

  // 🧑‍💼 managers count
  const managerCounts = await ManagerTeam.aggregate([
    {
      $match: { team: { $in: teamIds } },
    },
    {
      $group: {
        _id: '$team',
        totalManagers: { $sum: 1 },
      },
    },
  ]);

  const result = teams.map((team) => {
    const members = memberCounts.find(
      (m) => m._id.toString() === team._id.toString()
    );

    const managers = managerCounts.find(
      (m) => m._id.toString() === team._id.toString()
    );

    return {
      ...team.toObject(),
      totalMembers: members?.totalMembers || 0,
      totalManagers: managers?.totalManagers || 0,
    };
  });

  return {
    meta,
    result,
  };
};

// GET SINGLE TEAM
const getSingleTeamFromDB = async (id: string) => {
  const team = await Team.findById(id);

  if (!team) {
    throw new Error('Team not found');
  }

  const members = await UserDetails.find({ selectTeam: id })
    .select('firstName lastName document position');

  const managers = await ManagerTeam.find({ team: id }).populate('manager');

  return {
    ...team.toObject(),
    members,
    managers,
    totalMembers: members.length,
    totalManagers: managers.length,
  };
};

// UPDATE TEAM
const updateTeamToDB = async (id: string, payload: any) => {
  const team = await Team.findById(id);

  if (!team) {
    throw new Error('Team not found');
  }

  return await Team.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  });
};

// DELETE TEAM
const deleteTeamFromDB = async (id: string) => {
  const team = await Team.findById(id);

  if (!team) {
    throw new Error('Team not found');
  }

  // optional cleanup
  // await ManagerTeam.deleteMany({ team: id });

  return await Team.findByIdAndDelete(id);
};

export const TeamService = {
  createTeamToDB,
  getAllTeamsFromDB,
  getSingleTeamFromDB,
  updateTeamToDB,
  deleteTeamFromDB,
};