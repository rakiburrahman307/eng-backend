import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiErrors';
import { Transfer } from './transfer.model';
import { User } from '../user/user.model';

import { ManagerTeam } from '../managerTeam/managerTeam.model';
import { UserDetails } from '../user/userDetails.model';

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
  const result = await Transfer.find()
    .populate('player')
    .populate('fromTeam')
    .populate('toTeam')
    .populate('requestedBy');

  return result;
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
  const transfer = await Transfer.findById(id);

  if (!transfer) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Transfer not found');
  }

  const userDetails = await UserDetails.findOne({
    userId: transfer.player,
  });

  userDetails!.selectTeam = transfer.toTeam as any;

  await userDetails!.save();

  transfer.status = 'APPROVED';
  transfer.approvedBy = adminId as any;

  await transfer.save();

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

export const TransferService = {
  createTransferToDB,
  getAllTransfersFromDB,
  getMyTransfersFromDB,
  getSingleTransferFromDB,
  approveTransferToDB,
  rejectTransferToDB,
  withdrawTransferToDB,
};