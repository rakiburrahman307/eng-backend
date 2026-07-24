import QueryBuilder from "../../../util/queryBuilder";
import { Team } from "./team.model";
import { ManagerTeam } from "../managerTeam/managerTeam.model";
import { User } from "../user/user.model";
import { ClubEconomy } from "../coinAndBudget/clubEconomySchema.model";

// CREATE TEAM
const createTeamToDB = async (payload: any) => {
  // Always assign starting budget and starting market value from ClubEconomy config in DB
  const clubEconomy = await ClubEconomy.findOne();
  const startingBudget = clubEconomy ? clubEconomy.startingBudget : 100000;
  payload.coin = startingBudget;
  payload.marketValue = startingBudget;
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
  const memberCounts = await User.aggregate([
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
  }).select("profile firstName lastName");

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

        return {
          _id: m.manager,
          firstName: user?.firstName || null,
          lastName: user?.lastName || null,
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

  const members = await User.find({ selectTeam: id }).select(
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

// UPDATE TEAM COIN OR MARKET VALUE (Admin only)
const updateTeamCoinOrMarketValue = async (
  id: string,
  payload: { coin?: number; marketValue?: number }
) => {
  const team = await Team.findById(id);

  if (!team) {
    throw new Error("Team not found");
  }

  const updateData: Record<string, number> = {};

  if (payload.coin !== undefined) {
    if (typeof payload.coin !== 'number' || payload.coin < 0) {
      throw new Error("coin must be a non-negative number");
    }
    updateData.coin = payload.coin;
  }

  if (payload.marketValue !== undefined) {
    if (typeof payload.marketValue !== 'number' || payload.marketValue < 0) {
      throw new Error("marketValue must be a non-negative number");
    }
    updateData.marketValue = payload.marketValue;
  }

  if (Object.keys(updateData).length === 0) {
    throw new Error("At least one field (coin or marketValue) must be provided");
  }

  return await Team.findByIdAndUpdate(
    id,
    { $set: updateData },
    { new: true, runValidators: true }
  );
};

export const TeamService = {
  createTeamToDB,
  getAllTeamsFromDB,
  getSingleTeamFromDB,
  updateTeamToDB,
  deleteTeamFromDB,
  updateTeamCoinOrMarketValue,
};
