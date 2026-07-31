import QueryBuilder from "../../../util/queryBuilder";
import { User } from "../user/user.model";
import { USER_ROLES } from "../../../enums/user";
import { Subscription } from "../subscription/subscription.model";
import { JwtPayload } from "jsonwebtoken";
import ApiError from "../../../errors/ApiErrors";

const checkCanViewOtherPlayers = async (user?: JwtPayload | null): Promise<boolean> => {
  if (!user || user.role !== USER_ROLES.PLAYER) return true;

  const userId = user._id || user.id;

  const subscription = await Subscription.findOne({
    user: userId,
    status: 'active',
  }).populate('package');

  if (subscription && subscription.package) {
    const pkg = subscription.package as any;
    if (pkg.canViewOtherPlayers === false || pkg.packageType === 'Semi Pro') {
      return false;
    }
  }
  return true;
};

const getAllPlayersFromDB = async (query: Record<string, any>, user?: JwtPayload | null) => {
  const canViewOther = await checkCanViewOtherPlayers(user);

  const filter: Record<string, any> = { role: USER_ROLES.PLAYER };
  if (!canViewOther && user) {
    filter._id = user._id || user.id;
  }

  const baseQuery = User.find(filter)
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
const getFilteredPlayersFromDB = async (query: Record<string, any>, user?: JwtPayload | null) => {
  const canViewOther = await checkCanViewOtherPlayers(user);
  const { team, position, page = 1, limit = 10 } = query;

  // Build filter
  const filter: Record<string, any> = { role: USER_ROLES.PLAYER };

  if (!canViewOther && user) {
    filter._id = user._id || user.id;
  }

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

// ✅ UPDATE PLAYER BY ADMIN
const updatePlayerByAdminToDB = async (id: string, payload: Partial<any>) => {
  const player = await User.findById(id);

  if (!player) {
    throw new ApiError(404, "Player not found");
  }

  const result = await User.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  }).populate({
    path: "selectTeam",
    select: "teamName shortName teamLogo",
  });

  return result;
};

export const PlayerService = {
  getAllPlayersFromDB,
  getFilteredPlayersFromDB,
  updatePlayerByAdminToDB,
};