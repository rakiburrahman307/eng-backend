import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiErrors';
import { Transfer } from './transfer.model';
import { User } from '../user/user.model';

import { ManagerTeam } from '../managerTeam/managerTeam.model';
import { UserDetails } from '../user/userDetails.model';
import { USER_ROLES } from '../../../enums/user';

// CREATE
const createTransferToDB = async (payload: any, userId: string) => {
  const player = await User.findById(payload.player);

  if (!player) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Player not found');
  }

  const userDetails = await UserDetails.findOne({
    userId: payload.player,
  });

  const fromTeam = userDetails?.selectTeam || null;

  let transferType: any = 'CLUB_TO_CLUB';

  if (!fromTeam) {
    transferType = 'FREE_AGENT';
  }

  const isManager = await ManagerTeam.findOne({
    manager: userId,
    team: payload.toTeam,
  });

  if (!isManager) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Not your team');
  }

  const transfer = await Transfer.create({
    player: payload.player,
    fromTeam,
    toTeam: payload.toTeam,
    requestedBy: userId,
    transferType,
  });

  return transfer;
};

// GET ALL
const getAllTransfersFromDB = async (query: Record<string, any>) => {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;
  const skip = (page - 1) * limit;

  const filter: any = {
    status: query.status || 'PENDING',
  };

  const [transfers, total] = await Promise.all([
    Transfer.find(filter)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })

      .populate({
        path: 'player',
        select: 'email profile role',
      })
      .populate({
        path: 'requestedBy',
        select: 'email profile role',
      })
      .populate({
        path: 'approvedBy',
        select: 'email profile role',
      })
      .populate({
        path: 'fromTeam',
        select: 'teamName',
      })
      .populate({
        path: 'toTeam',
        select: 'teamName',
      }),

    Transfer.countDocuments(filter),
  ]);

  // 🔥 STEP 1: collect all user ids
  const userIds = transfers.flatMap((t: any) => [
    t.player?._id,
    t.requestedBy?._id,
    t.approvedBy?._id,
  ]).filter(Boolean);

  // 🔥 STEP 2: get UserDetails (firstName + lastName)
  const details = await UserDetails.find({
    userId: { $in: userIds },
  });

  const getDetails = (id: string) =>
    details.find((d) => d.userId.toString() === id?.toString());

  // 🔥 STEP 3: FLAT RESPONSE
  const result = transfers.map((t: any) => {
    const playerD = getDetails(t.player?._id);
    const reqD = getDetails(t.requestedBy?._id);
    const appD = getDetails(t.approvedBy?._id);

    return {
      id: t._id,

      // PLAYER
      playerFirstName: playerD?.firstName || null,
      playerLastName: playerD?.lastName || null,
      playerEmail: t.player?.email,
      playerProfile: t.player?.profile,

      // FROM TEAM
      fromTeamName: t.fromTeam?.teamName || null,

      // TO TEAM
      toTeamName: t.toTeam?.teamName || null,

      // REQUESTED BY
      requestedByFirstName: reqD?.firstName || null,
      requestedByLastName: reqD?.lastName || null,
      requestedByEmail: t.requestedBy?.email,

      // APPROVED BY
      approvedByFirstName: appD?.firstName || null,
      approvedByLastName: appD?.lastName || null,

      // MAIN DATA
      transferType: t.transferType,
      status: t.status,
      rejectReason: t.rejectReason,

      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    };
  });

  return {
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    result,
  };
};
// MY TRANSFERS
const getMyTransfersFromDB = async (userId: string) => {
  return await Transfer.find({
    requestedBy: userId,
  })
    .populate('player')
    .populate('fromTeam')
    .populate('toTeam');
};

// SINGLE
const getSingleTransferFromDB = async (id: string) => {
  const transfer = await Transfer.findById(id)
    .populate('player')
    .populate('fromTeam')
    .populate('toTeam');

  if (!transfer) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Transfer not found');
  }

  return transfer;
};

// APPROVE
const approveTransferToDB = async (id: string, adminId: string) => {
  console.log("🚀 APPROVE TRANSFER START");
  console.log("🆔 transferId:", id);
  console.log("👮 adminId:", adminId);

  // 1. Find transfer
  const transfer = await Transfer.findById(id);

  console.log("📦 transfer found:", transfer);

  if (!transfer) {
    console.log("❌ Transfer not found");
    throw new ApiError(StatusCodes.NOT_FOUND, 'Transfer not found');
  }

  console.log("🎯 player:", transfer.player);
  console.log("🏁 fromTeam:", transfer.fromTeam);
  console.log("🏁 toTeam:", transfer.toTeam);
  console.log("📊 current status:", transfer.status);

  // 2. Find user details
  const userDetails = await UserDetails.findOne({
    userId: transfer.player,
  });

  console.log("🧾 userDetails before update:", userDetails);

  if (!userDetails) {
    console.log("❌ UserDetails not found for player");
    throw new ApiError(StatusCodes.NOT_FOUND, "UserDetails not found");
  }

  // 3. Update team
  console.log("🔄 Updating player team...");
  userDetails.selectTeam = transfer.toTeam as any;

  await userDetails.save();

  console.log("✅ Player team updated:", userDetails.selectTeam);

  // 4. Update transfer
  console.log("✍️ Updating transfer status...");
  transfer.status = 'APPROVED';
  transfer.approvedBy = adminId as any;

  await transfer.save();

  console.log("✅ Transfer approved successfully");

  return transfer;
};

// REJECT
const rejectTransferToDB = async (
  id: string,
  reason: string,
  adminId: string
) => {
  const transfer = await Transfer.findById(id);

  if (!transfer) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Transfer not found');
  }

  transfer.status = 'REJECTED';
  transfer.rejectReason = reason;
  transfer.approvedBy = adminId as any;

  await transfer.save();

  return transfer;
};

// WITHDRAW
const withdrawTransferToDB = async (transferId: string, userId: string) => {
  const transfer = await Transfer.findById(transferId);

  if (!transfer) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Transfer not found');
  }

  if (transfer.requestedBy.toString() !== userId.toString()) {
    throw new ApiError(StatusCodes.FORBIDDEN, 'Not allowed');
  }

  if (transfer.status !== 'PENDING') {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Only pending can withdraw');
  }

  transfer.status = 'WITHDRAWN';

  await transfer.save();

  return transfer;
};

// avilabe 
const getAvailablePlayersFromDB = async () => {
  const players = await User.find({
    role: USER_ROLES.OTHER_CLUBS,
  })
    .select('-password')
    .sort({ createdAt: -1 });

  return players;
};

export const TransferService = {
  createTransferToDB,
  getAllTransfersFromDB,
  getMyTransfersFromDB,
  getSingleTransferFromDB,
  approveTransferToDB,
  rejectTransferToDB,
    withdrawTransferToDB,
    getAvailablePlayersFromDB
  
};