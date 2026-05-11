
import QueryBuilder from '../../../util/queryBilter';
import { UserDetails } from '../user/userDetails.model';
import { Team } from './team.model';

// CREATE
const createTeamToDB = async (payload: any) => {
  return await Team.create(payload);
};

// GET ALL (🔥 UPDATED WITH QUERY BUILDER)
const getAllTeamsFromDB = async (query: Record<string, any>) => {
  const teamQuery = new QueryBuilder(
    Team.find(),
    query
  )
    .search(['teamName', 'shortName', 'city', 'country'])
    .filter()
    .sort()
    .paginate()
    .fields();

  const teams = await teamQuery.modelQuery;
  const meta = await teamQuery.getPaginationInfo();

  // 🧠 add member count
  const teamIds = teams.map(t => t._id);

  const counts = await UserDetails.aggregate([
    {
      $match: {
        selectTeam: { $in: teamIds }
      }
    },
    {
      $group: {
        _id: "$selectTeam",
        totalMembers: { $sum: 1 }
      }
    }
  ]);

  // map count to team
  const finalResult = teams.map(team => {
    const found = counts.find(c => c._id.toString() === team._id.toString());
    return {
      ...team.toObject(),
      totalMembers: found?.totalMembers || 0
    };
  });

  return {
    meta,
    result: finalResult,
  };
};

// SINGLE
const getSingleTeamFromDB = async (id: string) => {
  const team = await Team.findById(id).populate('manager');

  if (!team) {
    throw new Error("Team not found");
  }

  const members = await UserDetails.find({ selectTeam: id })
    .select("firstName lastName document position");

  return {
    ...team.toObject(),
    members,
    totalMembers: members.length,
  };
};

// UPDATE
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

// DELETE
const deleteTeamFromDB = async (id: string) => {
  const team = await Team.findById(id);

  if (!team) {
    throw new Error('Team not found');
  }

  return await Team.findByIdAndDelete(id);
};

export const TeamService = {
  createTeamToDB,
  getAllTeamsFromDB,
  getSingleTeamFromDB,
  updateTeamToDB,
  deleteTeamFromDB,
};