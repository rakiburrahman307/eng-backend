import { StatusCodes } from "http-status-codes";
import ApiError from "../../../errors/ApiErrors";
import { Transfer } from "./transfer.model";
import { User } from "../user/user.model";
import { Team } from "../team/team.model";
import { ManagerTeam } from "../managerTeam/managerTeam.model";
import { USER_ROLES } from "../../../enums/user";
import mongoose from "mongoose";
import { NotificationQueueHelper } from "../../../helpers/bullMQ/bullHelper";
import { sendNotificationToAdmins } from "../../../helpers/notificationsHelper";
import { NOTIFICATION_TYPE } from "../notification/notification.interface";
import { ClubEconomy } from "../coinAndBudget/clubEconomySchema.model";

// CREATE
const createTransferToDB = async (payload: any, userId: string) => {
  // 1. Check player
  const player = await User.findById(payload.player);

  if (!player) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Player not found");
  }

  const fromTeam = player.selectTeam || null;

  // 🛑 CANNOT REQUEST OWN TEAM'S PLAYER
  if (fromTeam && fromTeam.toString() === payload.toTeam.toString()) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "You cannot send a transfer request for a player who is already in your team.",
    );
  }

  // 💰 CHECK BUYING TEAM COIN BALANCE (ONLY FOR REGULAR PLAYERS WITH A FROM-TEAM)
  const isTrialPlayer = !fromTeam || player.role === USER_ROLES.OTHER_CLUBS;
  const playerMarketValue = isTrialPlayer ? 0 : player.marketValue || 0;
  const toTeamData = await Team.findById(payload.toTeam);

  if (!toTeamData) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Target buying team not found");
  }

  // 💰 Fetch dynamic reserve balance from ClubEconomy
  const clubEconomy = await ClubEconomy.findOne();
  const minReserveCoins =
    typeof clubEconomy?.minReserveCoins === "number"
      ? clubEconomy.minReserveCoins
      : clubEconomy?.startingBudget || 100000;

  const buyingTeamCoin = toTeamData.coin || 0;
  if (
    !isTrialPlayer &&
    playerMarketValue > 0 &&
    buyingTeamCoin - playerMarketValue < minReserveCoins
  ) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `Insufficient team coin balance! Your team has ${buyingTeamCoin} coins. A minimum balance of ${minReserveCoins.toLocaleString()} coins must be maintained after transferring (Player cost: ${playerMarketValue.toLocaleString()} coins).`,
    );
  }

  // 3. Determine transfer type
  let transferType: any = "CLUB_TO_CLUB";

  if (isTrialPlayer) {
    transferType = "FREE_AGENT";
  }

  // 4. Check manager permission
  const isManager = await ManagerTeam.findOne({
    manager: userId,
    team: payload.toTeam,
  });

  if (!isManager) {
    throw new ApiError(StatusCodes.FORBIDDEN, "Not your team");
  }

  // 🛑 Check duplicate pending transfer request
  const existingPending = await Transfer.findOne({
    player: payload.player,
    toTeam: payload.toTeam,
    status: { $in: ["PENDING", "MANAGER_APPROVED"] },
  });

  if (existingPending) {
    throw new ApiError(
      StatusCodes.CONFLICT,
      "A pending transfer request already exists for this player.",
    );
  }

  // 5. Create transfer
  const transfer = await Transfer.create({
    player: payload.player,
    fromTeam,
    toTeam: payload.toTeam,
    requestedBy: userId,
    transferType,
  });

  const playerName = `${player.firstName || ""} ${player.lastName || player.userName || "Player"}`.trim();
  const buyingTeamName = toTeamData.teamName || "New Club";

  // 1.1 🔔 Notify Selling Club Managers (each club needs to receive a notification)
  if (fromTeam) {
    const sellingManagers = await ManagerTeam.find({ team: fromTeam });
    for (const sm of sellingManagers) {
      await NotificationQueueHelper.sendNotification(
        sm.manager.toString(),
        `${buyingTeamName} has submitted a transfer bid for your player ${playerName}. Please review and accept or decline.`,
        "New Transfer Bid Received",
        NOTIFICATION_TYPE.TRANSFER_REQUESTED,
        USER_ROLES.MANAGER,
        transfer._id.toString(),
        "Transfer",
      );
    }
  }

  // 1.1 🔔 Notify Parents (plus the parents)
  if (player.parentId) {
    await NotificationQueueHelper.sendNotification(
      player.parentId.toString(),
      `${buyingTeamName} has placed a transfer bid for your child ${playerName}. Awaiting club and league review.`,
      "Transfer Bid for Your Child",
      NOTIFICATION_TYPE.TRANSFER_REQUESTED,
      undefined,
      transfer._id.toString(),
      "Transfer",
    );
  }

  // 1.1 🔔 Notify Buying Club Manager (confirmation)
  await NotificationQueueHelper.sendNotification(
    userId,
    `Your transfer bid for ${playerName} has been submitted successfully and is awaiting review.`,
    "Transfer Bid Submitted",
    NOTIFICATION_TYPE.TRANSFER_REQUESTED,
    USER_ROLES.MANAGER,
    transfer._id.toString(),
    "Transfer",
  );

  // 🔔 Notify player: transfer request submitted via background queue helper
  await NotificationQueueHelper.sendNotification(
    payload.player.toString(),
    `A transfer request has been submitted for you by ${buyingTeamName}. Awaiting approval.`,
    "Transfer Request Submitted",
    NOTIFICATION_TYPE.TRANSFER_REQUESTED,
    USER_ROLES.PLAYER,
    transfer._id.toString(),
    "Transfer",
  );

  // 🔔 Notify admins: new transfer request
  await sendNotificationToAdmins({
    title: "New Transfer Request",
    message: `A new transfer request has been submitted for ${playerName} by ${buyingTeamName} (${transferType}). Please review.`,
    type: NOTIFICATION_TYPE.TRANSFER_REQUESTED,
    metadata: { transferId: transfer._id, transferType },
  });

  return transfer;
};

// GET ALL
const getAllTransfersFromDB = async (query: Record<string, any>) => {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;
  const skip = (page - 1) * limit;

  const filter: any = {};

  if (query.status) {
    filter.status = query.status;
  } else {
    // Default: show both PENDING and MANAGER_APPROVED requests needing Admin action
    filter.status = { $in: ["PENDING", "MANAGER_APPROVED"] };
  }

  const [transfers, total] = await Promise.all([
    Transfer.find(filter)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })

      .populate({
        path: "player",
        select: "email profile role",
      })
      .populate({
        path: "requestedBy",
        select: "email profile role",
      })
      .populate({
        path: "approvedBy",
        select: "email profile role",
      })
      .populate({
        path: "fromTeam",
        select: "teamName",
      })
      .populate({
        path: "toTeam",
        select: "teamName",
      }),

    Transfer.countDocuments(filter),
  ]);

  // 🔥 STEP 1: collect all user ids
  const userIds = transfers
    .flatMap((t: any) => [t.player?._id, t.requestedBy?._id, t.approvedBy?._id])
    .filter(Boolean);

  // 🔥 STEP 2: get UserDetails (firstName + lastName)
  const details = await User.find({
    _id: { $in: userIds },
  });

  const getDetails = (id: string) =>
    details.find((d) => d._id.toString() === id?.toString());

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
  const transfers = await Transfer.aggregate([
    {
      $match: {
        requestedBy: new mongoose.Types.ObjectId(userId),
      },
    },

    // User Profile
    {
      $lookup: {
        from: "users",
        localField: "player",
        foreignField: "_id",
        as: "playerUser",
      },
    },
    {
      $unwind: {
        path: "$playerUser",
        preserveNullAndEmptyArrays: true,
      },
    },

    // From Team
    {
      $lookup: {
        from: "teams",
        localField: "fromTeam",
        foreignField: "_id",
        as: "fromTeam",
      },
    },
    {
      $unwind: {
        path: "$fromTeam",
        preserveNullAndEmptyArrays: true,
      },
    },

    // To Team
    {
      $lookup: {
        from: "teams",
        localField: "toTeam",
        foreignField: "_id",
        as: "toTeam",
      },
    },
    {
      $unwind: {
        path: "$toTeam",
        preserveNullAndEmptyArrays: true,
      },
    },

    {
      $addFields: {
        player: {
          _id: "$player",
          firstName: "$playerUser.firstName",
          lastName: "$playerUser.lastName",
          profile: "$playerUser.profile",
        },
      },
    },

    {
      $project: {
        playerUser: 0,
      },
    },
  ]);

  return transfers;
};

// SINGLE
const getSingleTransferFromDB = async (id: string) => {
  const transfer = await Transfer.findById(id)
    .populate("player")
    .populate("fromTeam")
    .populate("toTeam");

  if (!transfer) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Transfer not found");
  }

  return transfer;
};

// APPROVE (2-Phase Approval: Manager Approve -> Admin Final Approve & Team Swap)
const approveTransferToDB = async (id: string, user: any) => {
  // 1. Find transfer
  const transfer = await Transfer.findById(id);

  if (!transfer) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Transfer not found");
  }

  const userId = user?._id || user?.id;
  const userRole = user?.role;

  // Fetch player details and teams for notification messages
  const player = await User.findById(transfer.player);
  const playerName = player
    ? `${player.firstName || ""} ${player.lastName || player.userName || "Player"}`.trim()
    : "Player";
  const toTeamObj = await Team.findById(transfer.toTeam);
  const fromTeamObj = transfer.fromTeam ? await Team.findById(transfer.fromTeam) : null;
  const toTeamName = toTeamObj?.teamName || "New Club";
  const fromTeamName = fromTeamObj?.teamName || "Current Club";

  // 🛑 PHASE 1: MANAGER APPROVAL (Step 1.2: Club needs to accept)
  if (userRole === USER_ROLES.MANAGER) {
    if (transfer.fromTeam) {
      const isFromTeamManager = await ManagerTeam.findOne({
        manager: userId,
        team: transfer.fromTeam,
      });

      if (!isFromTeamManager) {
        throw new ApiError(
          StatusCodes.FORBIDDEN,
          "Access Denied: Only the manager of the player's current team can approve this transfer.",
        );
      }
    }

    if (transfer.status === "MANAGER_APPROVED") {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        "This transfer has already been accepted by the club manager.",
      );
    }
    if (transfer.status === "APPROVED") {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        "This transfer has already been finalized by admin.",
      );
    }

    transfer.status = "MANAGER_APPROVED";
    await transfer.save();

    // 🔔 Notify Buying Club Manager
    await NotificationQueueHelper.sendNotification(
      transfer.requestedBy.toString(),
      `${fromTeamName} has accepted your transfer bid for ${playerName}. Awaiting final Admin approval.`,
      "Transfer Bid Accepted by Club 👍",
      NOTIFICATION_TYPE.TRANSFER_REQUESTED,
      USER_ROLES.MANAGER,
      transfer._id.toString(),
      "Transfer",
    );

    // 🔔 Notify Parents
    if (player?.parentId) {
      await NotificationQueueHelper.sendNotification(
        player.parentId.toString(),
        `${fromTeamName} has accepted the transfer bid for ${playerName}. Awaiting final league approval.`,
        "Transfer Bid Accepted by Club 👍",
        NOTIFICATION_TYPE.TRANSFER_REQUESTED,
        undefined,
        transfer._id.toString(),
        "Transfer",
      );
    }

    // 🔔 Notify player via background queue
    await NotificationQueueHelper.sendNotification(
      transfer.player.toString(),
      `Your club manager (${fromTeamName}) has approved the transfer request. Awaiting final Admin approval.`,
      "Manager Approved Transfer 👍",
      NOTIFICATION_TYPE.GENERAL,
      USER_ROLES.PLAYER,
      transfer._id.toString(),
      "Transfer",
    );

    // 🔔 Notify Admins for final approval
    await sendNotificationToAdmins({
      title: "Transfer Approved by Club Manager",
      message: `${fromTeamName} manager has accepted the transfer bid for ${playerName}. Final Admin approval is required.`,
      type: NOTIFICATION_TYPE.TRANSFER_REQUESTED,
      metadata: { transferId: transfer._id },
    });

    return transfer;
  }

  // 🛑 PHASE 2: ADMIN / SUPER_ADMIN FINAL APPROVAL (TEAM SWAP & COIN TRANSFER)
  if (userRole === USER_ROLES.ADMIN || userRole === USER_ROLES.SUPER_ADMIN) {
    if (transfer.status === "APPROVED") {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        "This transfer is already approved.",
      );
    }

    // For club-to-club transfers, selling club manager must accept first
    if (
      transfer.transferType === "CLUB_TO_CLUB" &&
      transfer.fromTeam &&
      transfer.status !== "MANAGER_APPROVED"
    ) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        "The selling club manager must accept the transfer request before final Admin approval.",
      );
    }

    const userDetails = await User.findById(transfer.player);

    if (!userDetails) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Player user not found");
    }

    const isTrialPlayer =
      !transfer.fromTeam || userDetails.role === USER_ROLES.OTHER_CLUBS;
    const playerMarketValue = isTrialPlayer ? 0 : userDetails.marketValue || 0;

    // 💰 1. Dynamic reserve check from ClubEconomy
    const clubEconomy = await ClubEconomy.findOne();
    const minReserveCoins =
      typeof clubEconomy?.minReserveCoins === "number"
        ? clubEconomy.minReserveCoins
        : clubEconomy?.startingBudget || 100000;

    // 2. Regular Player: Deduct coins from buying team (toTeam) enforcing dynamic minimum balance
    if (!isTrialPlayer && playerMarketValue > 0) {
      if (!toTeamObj) {
        throw new ApiError(
          StatusCodes.NOT_FOUND,
          "Target buying team not found",
        );
      }

      if ((toTeamObj.coin || 0) - playerMarketValue < minReserveCoins) {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          `Cannot complete transfer: Target buying team has insufficient coins (${toTeamObj.coin || 0} available). A minimum balance of ${minReserveCoins.toLocaleString()} coins must be maintained (Player cost: ${playerMarketValue.toLocaleString()} coins).`,
        );
      }

      toTeamObj.coin = (toTeamObj.coin || 0) - playerMarketValue;
      await toTeamObj.save();

      // 3. Add coins to selling team (fromTeam)
      if (fromTeamObj) {
        fromTeamObj.coin = (fromTeamObj.coin || 0) + playerMarketValue;
        await fromTeamObj.save();
      }
    }

    // 4. Swap player's team to new team & promote role if Trial Player
    userDetails.selectTeam = transfer.toTeam as any;
    if (userDetails.role === USER_ROLES.OTHER_CLUBS) {
      userDetails.role = USER_ROLES.PLAYER;
    }
    await userDetails.save();

    transfer.status = "APPROVED";
    transfer.approvedBy = userId as any;
    await transfer.save();

    // 1.3 🔔 Notify Buying Club Manager
    await NotificationQueueHelper.sendNotification(
      transfer.requestedBy.toString(),
      `Transfer Complete! ${playerName} has officially joined ${toTeamName}.`,
      "🎉 Transfer Complete!",
      NOTIFICATION_TYPE.TRANSFER_APPROVED,
      USER_ROLES.MANAGER,
      transfer._id.toString(),
      "Transfer",
    );

    // 1.3 🔔 Notify Selling Club Manager(s)
    if (transfer.fromTeam) {
      const sellingManagers = await ManagerTeam.find({ team: transfer.fromTeam });
      for (const sm of sellingManagers) {
        await NotificationQueueHelper.sendNotification(
          sm.manager.toString(),
          `Transfer Complete! ${playerName} has moved to ${toTeamName}.${playerMarketValue > 0 ? ` ${playerMarketValue.toLocaleString()} coins have been credited to your club.` : ""}`,
          "🎉 Transfer Finalized",
          NOTIFICATION_TYPE.TRANSFER_APPROVED,
          USER_ROLES.MANAGER,
          transfer._id.toString(),
          "Transfer",
        );
      }
    }

    // 1.3 🔔 Notify Parents
    if (userDetails.parentId) {
      await NotificationQueueHelper.sendNotification(
        userDetails.parentId.toString(),
        `Transfer Complete! ${playerName} is now officially registered with ${toTeamName}.`,
        "🎉 Transfer Complete!",
        NOTIFICATION_TYPE.TRANSFER_APPROVED,
        undefined,
        transfer._id.toString(),
        "Transfer",
      );
    }

    // 🔔 Notify player: transfer approved via background queue
    await NotificationQueueHelper.sendNotification(
      transfer.player.toString(),
      `Congratulations! Your transfer request to ${toTeamName} has been fully approved by Admin. You are now part of the new team.`,
      "🎉 Transfer Approved!",
      NOTIFICATION_TYPE.TRANSFER_APPROVED,
      USER_ROLES.PLAYER,
      transfer._id.toString(),
      "Transfer",
    );

    return transfer;
  }

  throw new ApiError(
    StatusCodes.FORBIDDEN,
    "Unauthorized role to approve transfer",
  );
};

// REJECT
const rejectTransferToDB = async (
  id: string,
  reason: string,
  userId: string,
  userRole?: string,
) => {
  const transfer = await Transfer.findById(id);

  if (!transfer) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Transfer not found");
  }

  if (userRole === USER_ROLES.MANAGER) {
    if (transfer.fromTeam) {
      const isFromTeamManager = await ManagerTeam.findOne({
        manager: userId,
        team: transfer.fromTeam,
      });

      if (!isFromTeamManager) {
        throw new ApiError(
          StatusCodes.FORBIDDEN,
          "Access Denied: Only the manager of the player's current team can reject this transfer.",
        );
      }
    }
  }

  transfer.status = "REJECTED";
  transfer.rejectReason = reason;
  transfer.approvedBy = userId as any;

  await transfer.save();

  const player = await User.findById(transfer.player);
  const playerName = player
    ? `${player.firstName || ""} ${player.lastName || player.userName || "Player"}`.trim()
    : "Player";

  // 🔔 Notify Buying Club Manager
  await NotificationQueueHelper.sendNotification(
    transfer.requestedBy.toString(),
    `The transfer bid for ${playerName} was declined. Reason: ${reason || "No reason provided."}`,
    "Transfer Request Declined",
    NOTIFICATION_TYPE.TRANSFER_REJECTED,
    USER_ROLES.MANAGER,
    transfer._id.toString(),
    "Transfer",
  );

  // 🔔 Notify Parents
  if (player?.parentId) {
    await NotificationQueueHelper.sendNotification(
      player.parentId.toString(),
      `The transfer bid for ${playerName} was declined. Reason: ${reason || "No reason provided."}`,
      "Transfer Request Declined",
      NOTIFICATION_TYPE.TRANSFER_REJECTED,
      undefined,
      transfer._id.toString(),
      "Transfer",
    );
  }

  // 🔔 Notify player: transfer rejected via background queue
  await NotificationQueueHelper.sendNotification(
    transfer.player.toString(),
    `Your transfer request has been rejected. Reason: ${reason || "No reason provided."}`,
    "Transfer Request Rejected",
    NOTIFICATION_TYPE.TRANSFER_REJECTED,
    USER_ROLES.PLAYER,
    transfer._id.toString(),
    "Transfer",
  );

  return transfer;
};

// WITHDRAW
const withdrawTransferToDB = async (transferId: string, userId: string) => {
  const transfer = await Transfer.findById(transferId);

  if (!transfer) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Transfer not found");
  }

  if (transfer.requestedBy.toString() !== userId.toString()) {
    throw new ApiError(StatusCodes.FORBIDDEN, "Not allowed");
  }

  if (transfer.status !== "PENDING") {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Only pending can withdraw");
  }

  transfer.status = "WITHDRAWN";

  await transfer.save();

  return transfer;
};

// avilabe
const getAvailablePlayersFromDB = async (
  managerId: string,
  page = 1,
  limit = 10,
) => {
  const managerObjectId = new mongoose.Types.ObjectId(managerId);
  const skip = (page - 1) * limit;

  // Find requesting manager's assigned team
  const managerTeam = await ManagerTeam.findOne({ manager: managerObjectId });
  const managerTeamId = managerTeam ? managerTeam.team : null;

  const matchConditions: any = {
    status: "APPROVED",
    role: { $in: [USER_ROLES.OTHER_CLUBS] },
    $or: [
      { parentId: { $ne: null } },
      { password: null },
      { email: null },
      { position: { $exists: true, $ne: null } },
      { dateOfBirth: { $exists: true, $ne: null } },
    ],
  };

  // Exclude players already belonging to requesting manager's own team
  if (managerTeamId) {
    matchConditions.selectTeam = { $ne: managerTeamId };
  }

  const result = await User.aggregate([
    // 1️⃣ Filter players (Exclude Parent accounts & manager's own team players)
    {
      $match: matchConditions,
    },

    // 2️⃣ Approved transfers
    {
      $lookup: {
        from: "transfers",
        let: { playerId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$player", "$$playerId"] },
                  { $eq: ["$status", "APPROVED"] },
                ],
              },
            },
          },
        ],
        as: "approvedTransfers",
      },
    },

    // 3️⃣ Pending by this manager
    {
      $lookup: {
        from: "transfers",
        let: {
          playerId: "$_id",
          managerId: managerObjectId,
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$player", "$$playerId"] },
                  { $eq: ["$status", "PENDING"] },
                  { $eq: ["$requestedBy", "$$managerId"] },
                ],
              },
            },
          },
        ],
        as: "myPending",
      },
    },

    // 4️⃣ Flags
    {
      $addFields: {
        isApproved: { $gt: [{ $size: "$approvedTransfers" }, 0] },
        isMyPending: { $gt: [{ $size: "$myPending" }, 0] },
      },
    },

    // 5️⃣ Filters
    {
      $match: {
        approvedTransfers: { $eq: [] },
        myPending: { $eq: [] },
      },
    },

    // 7️⃣ Final projection
    {
      $project: {
        _id: 1,
        userName: 1,
        profile: 1,
        email: 1,
        role: 1,
        createdAt: 1,

        firstName: 1,
        lastName: 1,
        phone: 1,
        selectTeam: 1,

        isApproved: 1,
        isMyPending: 1,
      },
    },

    // 8️⃣ SORT
    {
      $sort: { createdAt: -1 },
    },

    // 9️⃣ PAGINATION (IMPORTANT)
    {
      $facet: {
        data: [{ $skip: skip }, { $limit: limit }],
        meta: [{ $count: "total" }],
      },
    },
  ]);

  const data = result[0]?.data || [];
  const total = result[0]?.meta[0]?.total || 0;

  return {
    meta: {
      total,
      page,
      limit,
      totalPage: Math.ceil(total / limit),
    },
    data,
  };
};

const getManagerTransferRequestsFromDB = async (
  managerId: string,
  query: Record<string, any>,
) => {
  const managerTeams = await ManagerTeam.find({
    manager: managerId,
  });

  if (!managerTeams || !managerTeams.length) {
    return [];
  }

  const myTeamIds = managerTeams.map((item) => item.team);

  // 📥 INCOMING REQUESTS ONLY: Requests sent by other teams for players in THIS manager's team (fromTeam)
  const transfers = await Transfer.find({
    fromTeam: { $in: myTeamIds },
  })
    .populate({
      path: "player",
      select: "email profile userName firstName lastName",
    })
    .populate({
      path: "fromTeam",
      select: "teamName shortName teamLogo",
    })
    .populate({
      path: "toTeam",
      select: "teamName shortName teamLogo",
    })
    .sort({ createdAt: -1 })
    .lean();

  if (!transfers.length) return [];

  // 🔥 ADD USERDETAILS MANUALLY IF NEEDED
  const userIds = transfers.map((t) => t.player?._id).filter(Boolean);

  const details = await User.find({
    _id: { $in: userIds },
  });

  const detailsMap = new Map(details.map((d) => [d._id.toString(), d]));

  const result = transfers.map((t: any) => {
    const playerObj = t.player || {};
    const d: any = detailsMap.get(playerObj._id?.toString());

    return {
      ...t,
      player: {
        ...playerObj,
        firstName: d?.firstName || playerObj.firstName || null,
        lastName: d?.lastName || playerObj.lastName || null,
      },
    };
  });

  return result;
};

export const TransferService = {
  createTransferToDB,
  getAllTransfersFromDB,
  getMyTransfersFromDB,
  getSingleTransferFromDB,
  approveTransferToDB,
  rejectTransferToDB,
  withdrawTransferToDB,
  getAvailablePlayersFromDB,
  getManagerTransferRequestsFromDB,
};
