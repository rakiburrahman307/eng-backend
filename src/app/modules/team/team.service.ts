import QueryBuilder from "../../../util/queryBuilder";
import { Team } from "./team.model";
import { UserDetails } from "../user/userDetails.model";
import { ManagerTeam } from "../managerTeam/managerTeam.model";
import { User } from "../user/user.model";

// CREATE TEAM
const createTeamToDB = async (payload: any) => {
  return await Team.create(payload);
};

// GET ALL TEAMS
const getAllTeamsFromDB = async (query: Record<string, any>) => {
  const teamQuery = new QueryBuilder(Team.find(), query)
    .search(["teamName", "shortName", "city", "country"])
    .filter()
    .sort()
    .paginate()
    .fields();

  const teams = await teamQuery.modelQuery;
  const meta = await teamQuery.getPaginationInfo();

  const teamIds = teams.map((t) => t._id);

  // 👥 MEMBERS COUNT
  const memberCounts = await UserDetails.aggregate([
    {
      $match: { selectTeam: { $in: teamIds } },
    },
    {
      $group: {
        _id: "$selectTeam",
        totalMembers: { $sum: 1 },
      },
    },
  ]);

  // 🧑‍💼 MANAGER LINKS
  const managerLinks = await ManagerTeam.find({
    team: { $in: teamIds },
  });

  const managerUserIds = managerLinks.map((m) => m.manager);

  // 🧑‍💼 USER DETAILS (PROFILE FROM USER MODEL)
  const users = await User.find({
    _id: { $in: managerUserIds },
  }).select("profile");

  // 🧑‍💼 USER DETAILS (NAME FROM USERDETAILS MODEL)
  const userDetails = await UserDetails.find({
    userId: { $in: managerUserIds },
  }).select("userId firstName lastName");

  // MAP RESULT
  const result = teams.map((team) => {
    const members = memberCounts.find(
      (m) => m._id.toString() === team._id.toString()
    );

    const managers = managerLinks
      .filter((m) => m.team.toString() === team._id.toString())
      .map((m) => {
        const user = users.find(
          (u) => u._id.toString() === m.manager.toString()
        );

        const detail = userDetails.find(
          (d) => d.userId.toString() === m.manager.toString()
        );

        return {
          _id: m.manager,
          firstName: detail?.firstName || null,
          lastName: detail?.lastName || null,
          profile: user?.profile || null,
        };
      });

    return {
      ...team.toObject(),
      totalMembers: members?.totalMembers || 0,
      totalManagers: managers.length,
      managers: managers[0] || null,
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
    throw new Error("Team not found");
  }

  const members = await UserDetails.find({ selectTeam: id }).select(
    "firstName lastName document position",
  );

  const managers = await ManagerTeam.find({ team: id }).populate("manager");

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
    throw new Error("Team not found");
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
    throw new Error("Team not found");
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
