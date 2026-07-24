import QueryBuilder from "../../../util/queryBuilder";
import { User } from "../user/user.model";
import { USER_ROLES } from "../../../enums/user";


const getAllPlayersFromDB = async (query: Record<string, any>) => {
  const baseQuery = User.find({ role: USER_ROLES.PLAYER })
    .populate({
      path: "selectTeam",
      select: "teamName shortName teamLogo",
    });

  const queryBuilder = new QueryBuilder(baseQuery, query)
    .search(["firstName", "lastName", "position"])
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await queryBuilder.modelQuery;

    const players = result.map((player: any) => ({
    _id: player._id,
    firstName: player.firstName,
    lastName: player.lastName,
    position: player.position,
    engCoine: player.engCoine || 0,
    marketValue: player.marketValue || 0,
    profile: player.profile || null,
    teamName: player.selectTeam?.teamName || null,
    shortName: player.selectTeam?.shortName || null,
    teamLogo: player.selectTeam?.teamLogo || null,
  }));

  return {
    players,
    pagination: await queryBuilder.getPaginationInfo(),
  };
};


// ✅ FILTER PLAYERS BY TEAM AND/OR POSITION
const getFilteredPlayersFromDB = async (query: Record<string, any>) => {
  const { team, position, page = 1, limit = 10 } = query;
  // Build filter
  const filter: Record<string, any> = { role: USER_ROLES.PLAYER };
  if (team) {
    filter.selectTeam = team;
  }
  if (position) {
    filter.position = {
      $regex: position,
      $options: "i",
    };
  }
  const pageNum = Number(page);
  const limitNum = Number(limit);
  const skip = (pageNum - 1) * limitNum;
  const result = await User.find(filter)
    .populate({
      path: "selectTeam",
      select: "teamName shortName teamLogo",
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum);

  const total = await User.countDocuments(filter);
  const players = result.map((player: any) => ({
    _id: player._id,
    firstName: player.firstName,
    lastName: player.lastName,
    position: player.position,
    engCoine: player.engCoine || 0,
    marketValue: player.marketValue || 0,
    profile: player.profile || null,
    teamName: player.selectTeam?.teamName || null,
    shortName: player.selectTeam?.shortName || null,
    teamLogo: player.selectTeam?.teamLogo || null,
  }));

  return {
    players,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPage: Math.ceil(total / limitNum),
    },
  };
};


export const PlayerService = {
  getAllPlayersFromDB,
  getFilteredPlayersFromDB,
};