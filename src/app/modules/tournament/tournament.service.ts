import { Types } from 'mongoose';
import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiErrors';
import QueryBuilder from '../../../util/queryBuilder';
import { ITournament } from './tournament.interface';
import { Tournament } from './tournament.model';
import { User } from '../user/user.model';

const createTournamentToDB = async (
  payload: Partial<ITournament>,
  userId?: string
): Promise<ITournament> => {
  if (!payload.title || !payload.description || !payload.startDate || !payload.endDate) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Title, description, startDate, and endDate are required'
    );
  }

  const start = new Date(payload.startDate);
  const end = new Date(payload.endDate);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid startDate or endDate');
  }

  if (start >= end) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'startDate must be before endDate');
  }

  const result = await Tournament.create({
    ...payload,
    startDate: start,
    endDate: end,
    createdBy: userId,
  });

  return result;
};

const getAllTournamentsFromDB = async (query: Record<string, any>) => {
  const tournamentQuery = new QueryBuilder(Tournament.find(), query)
    .search(['title', 'description'])
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await tournamentQuery.modelQuery;
  const meta = await tournamentQuery.getPaginationInfo();

  return {
    meta,
    result,
  };
};

const getSingleTournamentFromDB = async (id: string): Promise<ITournament | null> => {
  const result = await Tournament.findById(id).populate({
    path: 'redeemedPlayers.player',
    select: 'userName firstName lastName fullName email profile jerseyNumber role selectTeam',
  });
  if (!result) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Tournament not found');
  }
  return result;
};

const updateTournamentInDB = async (
  id: string,
  payload: Partial<ITournament>
): Promise<ITournament | null> => {
  const isExist = await Tournament.findById(id);
  if (!isExist) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Tournament not found');
  }

  if (payload.startDate && payload.endDate) {
    const start = new Date(payload.startDate);
    const end = new Date(payload.endDate);
    if (start >= end) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'startDate must be before endDate');
    }
  }

  const result = await Tournament.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  });

  return result;
};

const deleteTournamentFromDB = async (id: string): Promise<ITournament | null> => {
  const isExist = await Tournament.findById(id);
  if (!isExist) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Tournament not found');
  }

  const result = await Tournament.findByIdAndDelete(id);
  return result;
};

const getTournamentQrCodeFromDB = async (tournamentId: string) => {
  const tournament = await Tournament.findById(tournamentId).populate({
    path: 'redeemedPlayers.player',
    select: 'userName firstName lastName fullName email profile jerseyNumber role selectTeam',
  });
  if (!tournament) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Tournament not found');
  }

  let isModified = false;
  if (!tournament.rewardToken) {
    tournament.rewardToken = Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    isModified = true;
  }

  if (tournament.positionRewards && tournament.positionRewards.length > 0) {
    tournament.positionRewards.forEach((reward: any) => {
      if (!reward.rewardToken) {
        reward.rewardToken = Math.random().toString(36).substring(2, 10) + Date.now().toString(36) + '_' + reward.position;
        isModified = true;
      }
    });
  }

  if (isModified) {
    await tournament.save();
  }

  const positionQrCodes = (tournament.positionRewards || []).map((reward: any) => {
    const qrPayload = {
      type: 'TOURNAMENT_REWARD',
      tournamentId: tournament._id?.toString(),
      position: reward.position,
      positionName: reward.positionName,
      points: reward.points,
      rewardToken: reward.rewardToken || tournament.rewardToken,
      title: tournament.title,
    };

    return {
      position: reward.position,
      positionName: reward.positionName,
      points: reward.points,
      rewardToken: reward.rewardToken || tournament.rewardToken,
      qrPayloadString: JSON.stringify(qrPayload),
      qrPayload,
    };
  });

  return {
    tournamentId: tournament._id,
    title: tournament.title,
    startDate: tournament.startDate,
    endDate: tournament.endDate,
    mainRewardToken: tournament.rewardToken,
    positionQrCodes,
    redeemedCount: tournament.redeemedPlayers?.length || 0,
    redeemedPlayers: tournament.redeemedPlayers || [],
  };
};

const redeemTournamentRewardInDB = async (
  userId: string,
  payload: { tournamentId?: string; rewardToken?: string; position?: number; qrData?: string; playerId?: string }
) => {
  let tournamentId = payload.tournamentId;
  let rewardToken = payload.rewardToken;
  let targetPosition = payload.position;
  let targetPlayerId = payload.playerId;

  if (payload.qrData) {
    try {
      const parsed = typeof payload.qrData === 'string' ? JSON.parse(payload.qrData) : payload.qrData;
      if (parsed.tournamentId) tournamentId = parsed.tournamentId;
      if (parsed.rewardToken) rewardToken = parsed.rewardToken;
      if (parsed.position !== undefined) targetPosition = Number(parsed.position);
      if (parsed.playerId) targetPlayerId = parsed.playerId;
    } catch {
      // ignore
    }
  }

  // Target player defaults to authenticated user if playerId is not explicitly provided
  const finalPlayerId = targetPlayerId || userId;
  if (!finalPlayerId) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Player ID or User ID is required for reward redemption');
  }

  if (!tournamentId || !rewardToken) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Tournament ID and QR reward token are required'
    );
  }

  const tournament = await Tournament.findById(tournamentId);
  if (!tournament) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Tournament not found');
  }

  const now = new Date();
  const startDate = new Date(tournament.startDate);
  const endDate = new Date(tournament.endDate);

  if (now < startDate) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Tournament has not started yet. Reward redemption is not active.'
    );
  }

  if (now > endDate) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Tournament reward redemption period has expired!'
    );
  }

  let matchedPosition = (tournament.positionRewards || []).find(
    (pr: any) =>
      pr.rewardToken === rewardToken ||
      (targetPosition !== undefined && pr.position === targetPosition)
  );

  if (!matchedPosition && tournament.rewardToken === rewardToken) {
    if (targetPosition !== undefined) {
      matchedPosition = (tournament.positionRewards || []).find(
        (pr: any) => pr.position === targetPosition
      );
    }
    if (!matchedPosition && tournament.positionRewards?.length > 0) {
      matchedPosition = tournament.positionRewards[0];
    }
  }

  if (!matchedPosition) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Invalid or expired QR code for this tournament position'
    );
  }

  const playerObjectId = new Types.ObjectId(finalPlayerId);

  const hasAlreadyRedeemed = tournament.redeemedPlayers?.some(
    (rp: any) => rp.player.toString() === finalPlayerId.toString()
  );

  if (hasAlreadyRedeemed) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'This player has already redeemed a prize for this tournament!'
    );
  }

  const prizeCoins = Number(matchedPosition.points) || 0;
  if (prizeCoins <= 0) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'No prize points set for this position'
    );
  }

  const user = await User.findById(finalPlayerId);
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Player profile not found');
  }

  const currentCoins = Number(user.engCoine) || 0;
  const newCoins = currentCoins + prizeCoins;
  const newMarketValue = newCoins * 100;

  user.engCoine = newCoins;
  user.marketValue = newMarketValue;
  await user.save();

  if (!tournament.redeemedPlayers) {
    tournament.redeemedPlayers = [];
  }

  tournament.redeemedPlayers.push({
    player: playerObjectId,
    position: matchedPosition.position,
    positionName: matchedPosition.positionName,
    redeemedAt: new Date(),
    coins: prizeCoins,
  });

  await tournament.save();


  const computedName =
    (user as any).fullName ||
    [user.firstName, user.lastName].filter(Boolean).join(' ').trim() ||
    user.userName ||
    'Player';

  return {
    tournamentId: tournament._id,
    tournamentTitle: tournament.title,
    playerId: user._id,
    playerName: computedName,
    position: matchedPosition.position,
    positionName: matchedPosition.positionName,
    redeemedCoins: prizeCoins,
    totalCoins: user.engCoine,
    marketValue: user.marketValue,
    redeemedAt: new Date(),
  };
};

export const TournamentService = {
  createTournamentToDB,
  getAllTournamentsFromDB,
  getSingleTournamentFromDB,
  updateTournamentInDB,
  deleteTournamentFromDB,
  getTournamentQrCodeFromDB,
  redeemTournamentRewardInDB,
};
