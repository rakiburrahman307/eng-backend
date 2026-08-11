import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiErrors';
import { USER_ROLES } from "../../../enums/user";
import QueryBuilder from "../../../util/queryBuilder";
import { User } from "../user/user.model";
import { Subscription } from "../subscription/subscription.model";

// GET ALL USERS
const getAllUsersFromDB = async (query: Record<string, any>) => {
  const queryObj = { ...query };
  const filterQuery: Record<string, any> = {
    role: { $ne: USER_ROLES.SUPER_ADMIN },
  };

  // Active subscription user IDs for players
  const activeSubUserIds = await Subscription.find({ status: 'active' }).distinct('user');

  // Base Eligibility Rule: Incomplete Managers, Incomplete Referees, and Unpaid Players are HIDDEN everywhere
  const baseEligibilityConditions = [
    // Manager with submitted documents
    {
      role: USER_ROLES.MANAGER,
      dateOfBirth: { $exists: true, $ne: null },
      document: { $exists: true, $ne: null, $nin: [[], ""] },
    },
    // Referee with submitted documents
    {
      role: USER_ROLES.REFEREE,
      dateOfBirth: { $exists: true, $ne: null },
      document: { $exists: true, $ne: null, $nin: [[], ""] },
    },
    // Player with active subscription
    {
      role: USER_ROLES.PLAYER,
      _id: { $in: activeSubUserIds },
    },
    // Other roles (Parents, Other Clubs, Admins, Tournament Players)
    {
      role: { $nin: [USER_ROLES.MANAGER, USER_ROLES.REFEREE, USER_ROLES.PLAYER] },
    },
  ];

  filterQuery.$or = baseEligibilityConditions;

  if (queryObj.role === 'PARENT') {
    filterQuery.parentId = null;
    filterQuery.email = { $ne: null };
    filterQuery.role = { $nin: [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN, USER_ROLES.MANAGER, USER_ROLES.REFEREE, USER_ROLES.OTHER_CLUBS] };
    filterQuery.position = { $exists: false };
    filterQuery.dateOfBirth = { $exists: false };
    delete queryObj.role;
  } else if (queryObj.role === 'PENDING_REQUESTS' || queryObj.status === 'PENDING') {
    filterQuery.status = 'PENDING';
    delete queryObj.role;
    delete queryObj.status;
  } else if (queryObj.role === 'MANAGER') {
    filterQuery.role = USER_ROLES.MANAGER;
    delete queryObj.role;
  } else if (queryObj.role === 'REFEREE') {
    filterQuery.role = USER_ROLES.REFEREE;
    delete queryObj.role;
  } else if (queryObj.role === 'PLAYER') {
    filterQuery.role = USER_ROLES.PLAYER;
    delete queryObj.role;
  } else if (queryObj.role === 'ALL') {
    delete queryObj.role;
  }

  const userQuery = new QueryBuilder(
    User.find(filterQuery)
      .select(
        'userName role profile verified status document selectTeam firstName lastName email phone location parentId ageGroup dateOfBirth position strongFoot previousClub rejectionReason emergencyEmail emergencyPhone playForAcademy academyClubName isDevelopmentPlayer mediaConsent engCoine marketValue createdAt'
      )
      .populate('selectTeam', 'teamName shortName teamLogo')
      .populate('parentId', 'firstName lastName email phone'),
    queryObj
  )
    .search(['userName', 'email', 'firstName', 'lastName', 'phone', 'location'])
    .filter()
    .sort()
    .paginate()
    .fields();

  const rawResult = await userQuery.modelQuery;
  const meta = await userQuery.getPaginationInfo();

  // Attach subscription info to result
  const userIds = rawResult.map((u: any) => u._id);
  const activeSubs = await Subscription.find({ user: { $in: userIds }, status: 'active' }).populate('package');

  const subMap = new Map();
  activeSubs.forEach((sub: any) => {
    subMap.set(sub.user.toString(), sub);
  });

  const result = rawResult.map((u: any) => {
    const userObj = u.toObject ? u.toObject() : u;
    const sub = subMap.get(u._id.toString());
    const userCoins = Number(userObj.engCoine ?? userObj.coin ?? userObj.coins) || 0;
    const userMV = Number(userObj.marketValue) || (userCoins * 100);

    return {
      ...userObj,
      engCoine: userCoins,
      marketValue: userMV,
      isPaid: Boolean(sub),
      subscription: sub ? {
        _id: sub._id,
        status: sub.status,
        price: sub.price,
        trxId: sub.trxId,
        subscriptionId: sub.subscriptionId,
        currentPeriodStart: sub.currentPeriodStart,
        currentPeriodEnd: sub.currentPeriodEnd,
        packageName: (sub.package as any)?.title || (sub.package as any)?.name || 'Subscription Package',
        packageDetails: sub.package || null,
      } : null,
    };
  });

  return {
    meta,
    result,
  };
};
// TOGGLE VERIFIED
const toggleVerifiedToDB = async (id: string) => {
  const user = await User.findById(id);

  if (!user) {
    throw new Error('User not found');
  }

  const result = await User.findByIdAndUpdate(
    id,
    {
      verified: !user.verified,
    },
    {
      new: true,
      runValidators: true,
    }
  );

  return result;
};

// DELETE USER
const deleteUserFromDB = async (id: string) => {
  const user = await User.findById(id);

  if (!user) {
    throw new Error('User not found');
  }

  return await User.findByIdAndDelete(id);
};


const getAllRefereesFromDB = async () => {
  const result = await User.find({
    role: { $in: [USER_ROLES.REFEREE] },
  })
    .select('_id userName firstName lastName email phone profile status')
    .lean();

  return result.map((r: any) => {
    const fullName = r.firstName ? `${r.firstName} ${r.lastName || ''}`.trim() : '';
    const displayName = fullName || r.userName || r.name || r.email || `Referee (${r._id.toString().slice(-4)})`;
    return {
      ...r,
      userName: displayName,
      name: displayName,
      displayName,
    };
  });
};

const getAllManagersFromDB = async () => {
  const result = await User.find({ role: USER_ROLES.MANAGER })
    .select('_id userName firstName lastName selectTeam')
    .populate('selectTeam', 'teamName shortName teamLogo');

  return result;
};

// GET USER MANAGEMENT ANALYTICS
const getUserAnalyticsFromDB = async () => {
  const activeSubUserIds = await Subscription.find({ status: 'active' }).distinct('user');

  const baseEligibilityConditions = [
    {
      role: USER_ROLES.MANAGER,
      dateOfBirth: { $exists: true, $ne: null },
      document: { $exists: true, $ne: null, $nin: [[], ""] },
    },
    {
      role: USER_ROLES.REFEREE,
      dateOfBirth: { $exists: true, $ne: null },
      document: { $exists: true, $ne: null, $nin: [[], ""] },
    },
    {
      role: USER_ROLES.PLAYER,
      _id: { $in: activeSubUserIds },
    },
    {
      role: { $nin: [USER_ROLES.MANAGER, USER_ROLES.REFEREE, USER_ROLES.PLAYER] },
    },
  ];

  const [
    totalUsers,
    totalParents,
    totalPlayers,
    pendingRequests,
    approvedPlayers,
    rejectedPlayers,
    totalManagers,
    totalClubs,
    totalReferees,
    verifiedUsers,
    totalTrialPlayers,
    totalTournamentPlayers,
  ] = await Promise.all([
    User.countDocuments({
      role: { $nin: [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN] },
      $or: baseEligibilityConditions,
    }),
    User.countDocuments({
      parentId: null,
      email: { $ne: null },
      role: { $nin: [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN, USER_ROLES.MANAGER, USER_ROLES.REFEREE, USER_ROLES.OTHER_CLUBS] },
      position: { $exists: false },
      dateOfBirth: { $exists: false },
    }),
    User.countDocuments({
      role: USER_ROLES.PLAYER,
      _id: { $in: activeSubUserIds },
    }),
    User.countDocuments({
      status: "PENDING",
      role: { $nin: [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN] },
      $or: baseEligibilityConditions,
    }),
    User.countDocuments({
      status: "APPROVED",
      role: { $nin: [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN] },
      $or: baseEligibilityConditions,
    }),
    User.countDocuments({
      status: "REJECTED",
      role: { $nin: [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN] },
      $or: baseEligibilityConditions,
    }),
    User.countDocuments({
      role: USER_ROLES.MANAGER,
      dateOfBirth: { $exists: true, $ne: null },
      document: { $exists: true, $ne: null, $nin: [[], ""] },
    }),
    User.countDocuments({ role: USER_ROLES.OTHER_CLUBS }),
    User.countDocuments({
      role: USER_ROLES.REFEREE,
      dateOfBirth: { $exists: true, $ne: null },
      document: { $exists: true, $ne: null, $nin: [[], ""] },
    }),
    User.countDocuments({
      verified: true,
      role: { $nin: [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN] },
      $or: baseEligibilityConditions,
    }),
    User.countDocuments({ role: USER_ROLES.OTHER_CLUBS }),
    User.countDocuments({ role: USER_ROLES.TOURNAMENT_PLAYER }),
  ]);

  return {
    totalUsers,
    totalParents,
    totalPlayers,
    pendingRequests,
    approvedPlayers,
    rejectedPlayers,
    totalManagers,
    totalClubs,
    totalReferees,
    verifiedUsers,
    totalTrialPlayers,
    totalTournamentPlayers,
  };
};

// UPDATE USER ROLE (Admin only)
const updateUserRoleToDB = async (userId: string, role: string) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found');
  }

  const validRoles = [
    USER_ROLES.PLAYER,
    USER_ROLES.TOURNAMENT_PLAYER,
    USER_ROLES.OTHER_CLUBS,
    USER_ROLES.MANAGER,
    USER_ROLES.REFEREE,
  ];

  if (!validRoles.includes(role as any)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid role type');
  }

  const updated = await User.findByIdAndUpdate(
    userId,
    { $set: { role } },
    { new: true, runValidators: true }
  );

  return updated;
};

// UPDATE USER PROFILE BY ADMIN (Profile Picture, Name, Details)
const updateUserProfileByAdminToDB = async (userId: string, payload: any) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found');
  }

  const updated = await User.findByIdAndUpdate(
    userId,
    { $set: payload },
    { new: true, runValidators: true }
  );

  return updated;
};

export const UserManagementService = {
  getAllUsersFromDB,
  toggleVerifiedToDB,
  deleteUserFromDB,
  getAllRefereesFromDB,
  getAllManagersFromDB,
  getUserAnalyticsFromDB,
  updateUserRoleToDB,
  updateUserProfileByAdminToDB,
};