import QueryBuilder from "../../../util/queryBuilder";
import { User } from "../user/user.model";
import { USER_ROLES } from "../../../enums/user";
import { Subscription } from "../subscription/subscription.model";
import { JwtPayload } from "jsonwebtoken";
import ApiError from "../../../errors/ApiErrors";
import { StatusCodes } from "http-status-codes";
import { Types } from "mongoose";
import { NotificationQueueHelper } from "../../../helpers/bullMQ/bullHelper";
import { NOTIFICATION_TYPE } from "../notification/notification.interface";
import { sendNotificationToAdmins } from "../../../helpers/notificationsHelper";
import { PlayerDashboardService } from "../playerDashboard/playerDashboard.service";
import { isPremiumPlayerPackage } from "../../../helpers/packageHelper";
import { getBatchPlayerStatsSummary } from "../../../helpers/playerStatsHelper";

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

// ========================== PARENT PLAYER MANAGEMENT ==========================

// 1. CREATE PLAYER BY PARENT
const createPlayerByParentToDB = async (parentId: string, payload: any) => {
  const parentUser = await User.findById(parentId);
  if (!parentUser) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Parent account not found");
  }

  // Calculate market value based on 1 coin = £100
  const coins = Number(payload.engCoine) || 0;
  const marketValue = coins * 100;

  const parseBool = (val: any) => val === true || val === "true" || val === 1 || val === "1";

  let teamId: Types.ObjectId | null = null;
  if (payload.selectTeam && Types.ObjectId.isValid(payload.selectTeam)) {
    teamId = new Types.ObjectId(payload.selectTeam);
  }
  const playerData: any = {
    ...payload,
    parentId: new Types.ObjectId(parentId),
    role: parentUser.role || USER_ROLES.PLAYER,
    status: "PENDING",
    verified: true,
    engCoine: coins,
    marketValue: marketValue,
    emergencyEmail: payload.emergencyEmail || payload.email || "",
    emergencyPhone: payload.emergencyPhone || payload.phone || payload.phoneNumber || "",
    isDevelopmentPlayer: parseBool(payload.isDevelopmentPlayer),
    playForAcademy: parseBool(payload.playForAcademy),
    mediaConsent: parseBool(payload.mediaConsent),
    selectTeam: teamId,
    dateOfBirth: payload.dateOfBirth ? new Date(payload.dateOfBirth) : undefined,
    password: null, // PLAYER HAS NO LOGIN
  };

  // Omit email field completely from child player document to prevent MongoDB index conflicts
  delete playerData.email;

  const newPlayer = await User.create(playerData);

  // Notify admins about new pending player registration
  try {
    await sendNotificationToAdmins({
      title: "New Player Profile Submitted",
      message: `A new player profile (${newPlayer.firstName} ${newPlayer.lastName}) has been added by parent (${parentUser.email}) and is pending approval.`,
      type: NOTIFICATION_TYPE.USER_REGISTERED,
      metadata: {
        playerId: newPlayer._id,
        parentId: parentUser._id,
      },
    });
  } catch (err) {
    console.error("Failed to notify admins of new player registration", err);
  }

  return newPlayer;
};

const getMyPlayersFromDB = async (parentId: string) => {
  const parentObjectId = Types.ObjectId.isValid(parentId) ? new Types.ObjectId(parentId) : parentId;

  const players = await User.find({
    $or: [
      { parentId: parentObjectId },
      { parentId: parentId },
    ],
  })
    .populate("selectTeam", "teamName shortName teamLogo")
    .lean();

  if (!players.length) {
    return [];
  }

  const playerIds = players.map((player) => player._id);

  const [subscriptions, statsMap] = await Promise.all([
    Subscription.find({
      user: { $in: playerIds },
      status: "active",
    })
      .populate("package")
      .lean(),
    getBatchPlayerStatsSummary(playerIds),
  ]);

  const subscriptionMap = new Map(
    subscriptions.map((subscription) => [
      subscription.user.toString(),
      subscription,
    ])
  );

  return players.map((player) => {
    const activeSubscription = subscriptionMap.get(player._id.toString());
    const playerStats = statsMap.get(player._id.toString()) || {
      goals: 0,
      assists: 0,
      cleanSheets: 0,
      playerOfTheDay: 0,
      yellowCards: 0,
      redCards: 0,
    };

    return {
      ...player,
      activeSubscription: activeSubscription || null,
      activePackage: activeSubscription?.package || null,
      stats: playerStats,
    };
  });
};

const getPlayerByIdFromDB = async (
  parentId: string,
  playerId: string
) => {
  const parentObjectId = Types.ObjectId.isValid(parentId) ? new Types.ObjectId(parentId) : parentId;

  const player = await User.findOne({
    _id: playerId,
    $or: [
      { parentId: parentObjectId },
      { parentId: parentId },
    ],
  })
    .populate("selectTeam", "teamName shortName teamLogo")
    .lean();

  if (!player) {
    throw new ApiError(
      StatusCodes.NOT_FOUND,
      "Player profile not found"
    );
  }

  const [activeSubscription, stats] = await Promise.all([
    Subscription.findOne({
      user: player._id,
      status: "active",
    })
      .populate("package")
      .lean(),

    PlayerDashboardService.getPlayerDashboardFromDB(
      player._id.toString()
    ),

  ]);

  const pkg: any = activeSubscription?.package;
  const isPremium = await isPremiumPlayerPackage(pkg);

  return {
    ...player,
    engCoine: isPremium ? (player.engCoine || 0) : null,
    marketValue: isPremium ? (player.marketValue || 0) : null,
    activeSubscription: activeSubscription || null,
    activePackage: activeSubscription?.package || null,
    isPremium,
    stats: isPremium ? stats.stats : null,
  };
};


// 4. UPDATE PLAYER BY PARENT (WITH OWNERSHIP CHECK)
const updatePlayerByParentToDB = async (
  parentId: string,
  playerId: string,
  payload: any
) => {
  const player = await User.findById(playerId);

  if (!player) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Player profile not found");
  }

  if (
    !player.parentId ||
    player.parentId.toString() !== parentId.toString()
  ) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      "You are not authorized to update this player profile"
    );
  }

  // Recalculate market value if engCoine is updated (1 coin = £100)
  if (payload.engCoine !== undefined) {
    payload.marketValue = Number(payload.engCoine) * 100;
  }

  // If player was REJECTED, resubmitting updates resets status to PENDING for admin review
  if (player.status === "REJECTED") {
    payload.status = "PENDING";
    payload.rejectionReason = "";
  }

  const updatedPlayer = await User.findByIdAndUpdate(playerId, payload, {
    new: true,
    runValidators: true,
  }).populate("selectTeam", "teamName shortName teamLogo");

  return updatedPlayer;
};

// 5. DELETE PLAYER BY PARENT (WITH OWNERSHIP CHECK)
const deletePlayerByParentToDB = async (parentId: string, playerId: string) => {
  const player = await User.findById(playerId);

  if (!player) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Player profile not found");
  }

  if (
    !player.parentId ||
    player.parentId.toString() !== parentId.toString()
  ) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      "You are not authorized to delete this player profile"
    );
  }

  return await User.findByIdAndDelete(playerId);
};

// ========================== ADMIN PLAYER APPROVAL ==========================

// 6. GET ALL PENDING PLAYERS FOR ADMIN REVIEW
const getPendingPlayersForAdminFromDB = async (query: Record<string, any>) => {
  const baseQuery = User.find({
    role: USER_ROLES.PLAYER,
    status: "PENDING",
  })
    .populate("parentId", "firstName lastName email phone")
    .populate("selectTeam", "teamName shortName teamLogo");

  const queryBuilder = new QueryBuilder(baseQuery, query)
    .search(["firstName", "lastName", "position", "ageGroup"])
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await queryBuilder.modelQuery;
  const meta = await queryBuilder.getPaginationInfo();

  return {
    meta,
    result,
  };
};

// 7. APPROVE PLAYER BY ADMIN
const approvePlayerByAdminToDB = async (playerId: string) => {
  const player = await User.findById(playerId);

  if (!player) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Player profile not found");
  }

  const updatedPlayer = await User.findByIdAndUpdate(
    playerId,
    { $set: { status: "APPROVED", rejectionReason: "" } },
    { new: true }
  ).populate("parentId", "firstName lastName email phone");

  // Send notification to Parent
  if (player.parentId) {
    try {
      await NotificationQueueHelper.sendNotification(
        player.parentId.toString(),
        `Great news! Player profile for "${player.firstName} ${player.lastName}" has been approved by admin. You can now register for products and events.`,
        "Player Profile Approved! 🎉",
        NOTIFICATION_TYPE.PLAYER_APPROVED
      );
    } catch (err) {
      console.error("Failed to send player approval notification", err);
    }
  }

  return updatedPlayer;
};

// 8. REJECT PLAYER BY ADMIN
const rejectPlayerByAdminToDB = async (playerId: string, reason?: string) => {
  const player = await User.findById(playerId);

  if (!player) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Player profile not found");
  }

  const rejectionReason = reason || "Profile did not meet verification criteria.";

  const updatedPlayer = await User.findByIdAndUpdate(
    playerId,
    { $set: { status: "REJECTED", rejectionReason } },
    { new: true }
  ).populate("parentId", "firstName lastName email phone");

  // Send notification to Parent
  if (player.parentId) {
    try {
      await NotificationQueueHelper.sendNotification(
        player.parentId.toString(),
        `Player profile for "${player.firstName} ${player.lastName}" was rejected. Reason: ${rejectionReason}`,
        "Player Profile Rejected ❌",
        NOTIFICATION_TYPE.PLAYER_REJECTED
      );
    } catch (err) {
      console.error("Failed to send player rejection notification", err);
    }
  }

  return updatedPlayer;
};

// ========================== EXISTING PLAYER QUERIES ==========================

const getAllPlayersFromDB = async (query: Record<string, any>, user?: JwtPayload | null) => {
  const canViewOther = await checkCanViewOtherPlayers(user);
  const queryObj = { ...query };

  // 1. Get user IDs with active subscriptions
  const activeSubUserIds = await Subscription.find({ status: 'active' }).distinct('user');

  // 2. Base Player Filter:
  // - MUST be a player profile belonging to a parent (parentId is NOT null)
  // - MUST be a complete profile (firstName, position, and dateOfBirth must be filled)
  // - MUST be paid (active subscription on player, active subscription on parent, or isSubscribed/hasAccess is true)
  const filter: Record<string, any> = {
    role: { $in: [USER_ROLES.PLAYER, USER_ROLES.OTHER_CLUBS, USER_ROLES.TOURNAMENT_PLAYER] },
    parentId: { $exists: true, $ne: null },
    firstName: { $exists: true, $nin: [null, ""] },
    position: { $exists: true, $nin: [null, ""] },
    dateOfBirth: { $exists: true, $ne: null },
    $or: [
      { _id: { $in: activeSubUserIds } },
      { parentId: { $in: activeSubUserIds } },
      { isSubscribed: true },
      { hasAccess: true },
    ],
  };

  if (queryObj.role && queryObj.role !== 'ALL') {
    filter.role = queryObj.role;
    delete queryObj.role;
  }

  if (queryObj.status && queryObj.status !== 'ALL') {
    filter.status = queryObj.status;
    delete queryObj.status;
  }

  if (!canViewOther && user) {
    filter._id = user._id || user.id;
  }

  const baseQuery = User.find(filter)
    .populate({
      path: "selectTeam",
      select: "teamName shortName teamLogo",
    })
    .populate({
      path: "parentId",
      select: "firstName lastName email phone userName profile",
    });

  const queryBuilder = new QueryBuilder(baseQuery, queryObj)
    .search(["firstName", "lastName", "position", "ageGroup", "email", "userName", "location"])
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await queryBuilder.modelQuery;

  const players = result.map((player: any) => ({
    _id: player._id,
    firstName: player.firstName,
    lastName: player.lastName,
    userName: player.userName || `${player.firstName || ''} ${player.lastName || ''}`.trim(),
    name: `${player.firstName || ''} ${player.lastName || ''}`.trim() || player.userName,
    email: player.email || player.emergencyEmail || null,
    phone: player.phone || null,
    role: player.role || "PLAYER",
    position: player.position || null,
    strongFoot: player.strongFoot || null,
    ageGroup: player.ageGroup || null,
    dateOfBirth: player.dateOfBirth || null,
    location: player.location || null,
    previousClub: player.previousClub || null,
    playForAcademy: player.playForAcademy || null,
    academyClubName: player.academyClubName || null,
    isDevelopmentPlayer: player.isDevelopmentPlayer || false,
    emergencyEmail: player.emergencyEmail || null,
    emergencyPhone: player.emergencyPhone || null,
    mediaConsent: player.mediaConsent || false,
    document: player.document || [],
    rejectionReason: player.rejectionReason || null,
    engCoine: player.engCoine || 0,
    coin: player.engCoine || 0,
    marketValue: player.marketValue || ((player.engCoine || 0) * 100),
    profile: player.profile || null,
    profilePic: player.profile || null,
    status: player.status || "PENDING",
    verified: player.verified ?? true,
    parentId: player.parentId || null,
    teamName: player.selectTeam?.teamName || null,
    shortName: player.selectTeam?.shortName || null,
    teamLogo: player.selectTeam?.teamLogo || null,
    selectTeam: player.selectTeam || null,
    createdAt: player.createdAt,
  }));

  return {
    players,
    pagination: await queryBuilder.getPaginationInfo(),
  };
};

const getFilteredPlayersFromDB = async (query: Record<string, any>, user?: JwtPayload | null) => {
  const canViewOther = await checkCanViewOtherPlayers(user);
  const { team, position, page = 1, limit = 10 } = query;

  const activeSubUserIds = await Subscription.find({ status: 'active' }).distinct('user');

  const filter: Record<string, any> = {
    role: { $in: [USER_ROLES.PLAYER, USER_ROLES.OTHER_CLUBS, USER_ROLES.TOURNAMENT_PLAYER] },
    parentId: { $exists: true, $ne: null },
    firstName: { $exists: true, $nin: [null, ""] },
    position: { $exists: true, $nin: [null, ""] },
    dateOfBirth: { $exists: true, $ne: null },
    $or: [
      { _id: { $in: activeSubUserIds } },
      { parentId: { $in: activeSubUserIds } },
      { isSubscribed: true },
      { hasAccess: true },
    ],
  };

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
    status: player.status || "PENDING",
    parentId: player.parentId || null,
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

const updatePlayerByAdminToDB = async (id: string, payload: Partial<any>) => {
  const player = await User.findById(id);

  if (!player) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Player not found");
  }

  if (payload.engCoine !== undefined) {
    payload.marketValue = Number(payload.engCoine) * 100;
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

// DELETE PLAYER BY ADMIN
const deletePlayerByAdminToDB = async (id: string) => {
  const player = await User.findById(id);

  if (!player) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Player not found");
  }

  await Promise.all([
    User.findByIdAndDelete(id),
    Subscription.deleteMany({ user: id }),
  ]);

  return { message: "Player deleted successfully" };
};

export const PlayerService = {
  createPlayerByParentToDB,
  getMyPlayersFromDB,
  getPlayerByIdFromDB,
  updatePlayerByParentToDB,
  deletePlayerByParentToDB,
  getPendingPlayersForAdminFromDB,
  approvePlayerByAdminToDB,
  rejectPlayerByAdminToDB,
  getAllPlayersFromDB,
  getFilteredPlayersFromDB,
  updatePlayerByAdminToDB,
  deletePlayerByAdminToDB,
};