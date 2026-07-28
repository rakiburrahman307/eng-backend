import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiErrors';
import { USER_ROLES } from '../../../enums/user';
import { Subscription } from '../subscription/subscription.model';
import { PlayerStats } from './playerStats.model';
import { JwtPayload } from 'jsonwebtoken';

const checkCanViewOtherPlayerStats = async (user?: JwtPayload | null): Promise<boolean> => {
  if (!user || user.role !== USER_ROLES.PLAYER) return true;

  const userId = user._id || user.id;

  const subscription = await Subscription.findOne({
    user: userId,
    status: 'active',
  }).populate('package');

  if (subscription && subscription.package) {
    const pkg = subscription.package as any;
    if (pkg.canViewOtherPlayerStats === false || pkg.packageType === 'Semi Pro') {
      return false;
    }
  }
  return true;
};

// GET ALL (LEADERBOARD)
const getAllPlayerStatsFromDB = async (user?: JwtPayload | null) => {
  const canViewOther = await checkCanViewOtherPlayerStats(user);

  const filter: Record<string, any> = {};
  if (!canViewOther && user) {
    filter.player = user._id || user.id;
  }

  return await PlayerStats.find(filter)
    .populate('player', 'name image email')
    .populate('team', 'teamName teamLogo')
    .sort({ goals: -1, assists: -1 });
};

// GET SINGLE PLAYER
const getSinglePlayerStatsFromDB = async (playerId: string, user?: JwtPayload | null) => {
  const currentUserId = user ? (user._id || user.id) : null;

  if (user && user.role === USER_ROLES.PLAYER && currentUserId && currentUserId.toString() !== playerId.toString()) {
    const canViewOther = await checkCanViewOtherPlayerStats(user);
    if (!canViewOther) {
      throw new ApiError(
        StatusCodes.FORBIDDEN,
        "Your package (Semi Pro) does not allow viewing other players' stats."
      );
    }
  }

  const result = await PlayerStats.findOne({ player: playerId })
    .populate('player', 'name image email')
    .populate('team', 'teamName teamLogo');

  return result || "No stats found for this player";
};

// ADMIN UPDATE
const updatePlayerStatsFromDB = async (
  playerId: string,
  payload: any
) => {
  const existing = await PlayerStats.findOne({ player: playerId });

  if (!existing) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Player stats not found');
  }

  return await PlayerStats.findOneAndUpdate(
    { player: playerId },
    {
      ...payload,
    },
    {
      new: true,
      runValidators: true,
    }
  );
};

export const PlayerStatsService = {
  getAllPlayerStatsFromDB,
  getSinglePlayerStatsFromDB,
  updatePlayerStatsFromDB,
};