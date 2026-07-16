import QueryBuilder from "../../../util/queryBuilder";
import { UserDetails } from "../user/userDetails.model";


const getAllPlayersFromDB = async (query: Record<string, any>) => {
  const baseQuery = UserDetails.find()
    .populate({
      path: "userId",
      select: "profile",
    })
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


    profile: player.userId?.profile || null,

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
  const filter: Record<string, any> = {};

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

  const result = await UserDetails.find(filter)
    .populate({
      path: "userId",
      select: "_id profile",
    })
    .populate({
      path: "selectTeam",
      select: "teamName shortName teamLogo",
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum);

  const total = await UserDetails.countDocuments(filter);

  const players = result.map((player: any) => ({
    // ✅ Return User model _id instead of UserDetails _id
    _id: player.userId?._id || null,

    firstName: player.firstName,
    lastName: player.lastName,
    position: player.position,

    profile: player.userId?.profile || null,

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