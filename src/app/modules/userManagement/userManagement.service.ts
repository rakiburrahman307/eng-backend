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

  // Base Eligibility Rule: Incomplete Managers, Incomplete Referees, Unpaid Players, and Pure Parent accounts are HIDDEN from member tables
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
    // Player with active subscription (excluding pure parent accounts)
    {
      role: {
        $in: [
          USER_ROLES.PLAYER,
          USER_ROLES.OTHER_CLUBS,
          USER_ROLES.TOURNAMENT_PLAYER,
        ],
      },
      _id: { $in: activeSubUserIds },
      $or: [
        { parentId: { $ne: null } },
        { position: { $exists: true, $ne: null } },
        { dateOfBirth: { $exists: true, $ne: null } },
        { ageGroup: { $exists: true, $ne: null } },
        { selectTeam: { $exists: true, $ne: null } },
        { email: null },
        { password: null },
      ],
    }
  ];

  filterQuery.$or = baseEligibilityConditions;

  if (queryObj.role === 'PENDING_REQUESTS') {
    filterQuery.status = 'PENDING';
    delete queryObj.role;
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

  if (queryObj.status) {
    if (queryObj.status === 'ALL' || queryObj.status === 'all') {
      delete filterQuery.status;
    } else {
      filterQuery.status = queryObj.status;
    }
    delete queryObj.status;
  } else if (!filterQuery.status) {
    filterQuery.status = 'APPROVED';
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

  const userIds = rawResult.map((u: any) => u._id);
  const parentIds = rawResult.map((u: any) => u.parentId?._id || u.parentId).filter(Boolean);
  const allUserIds = [...new Set([...userIds, ...parentIds])];

  const activeSubs = await Subscription.find({
    user: { $in: allUserIds },
    status: 'active',
  }).populate('package');

  const subMap = new Map();
  activeSubs.forEach((sub: any) => subMap.set(sub.user.toString(), sub));

  const result = rawResult.map((u: any) => {
    const userObj = u.toObject ? u.toObject() : u;
    const userCoins = Number(userObj.engCoine ?? userObj.coin ?? userObj.coins) || 0;
    const userMV = Number(userObj.marketValue) || (userCoins * 100);

    const directSub = subMap.get(userObj._id?.toString());
    const parentSub = userObj.parentId?._id
      ? subMap.get(userObj.parentId._id.toString())
      : (userObj.parentId ? subMap.get(userObj.parentId.toString()) : null);
    const activeSub = directSub || parentSub;

    return {
      ...userObj,
      engCoine: userCoins,
      marketValue: userMV,
      activeSubscription: activeSub || null,
      activePackage: activeSub?.package || null,
      isPaid: Boolean(activeSub),
    };
  });

  return {
    meta,
    result,
  };
};

// GET ALL PARENTS (DEDICATED API)
const getAllParentsFromDB = async (query: Record<string, any>) => {
  const queryObj = { ...query };
  const { page = 1, limit = 10, pageNumber, userPage, searchTerm, searchValue, search } = queryObj;

  const pageNum = Number(pageNumber || userPage || page) || 1;
  const limitNum = Number(limit) || 10;
  const skip = (pageNum - 1) * limitNum;

  const parentIdsWithChildren = await User.find({
    parentId: { $exists: true, $ne: null },
  }).distinct('parentId');

  const andConditions: any[] = [
    {
      $or: [
        { _id: { $in: parentIdsWithChildren } },
        {
          parentId: null,
          email: { $exists: true, $ne: null },
          role: { $nin: [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN, USER_ROLES.MANAGER, USER_ROLES.REFEREE] },
          position: { $in: [null, ""] },
          dateOfBirth: null,
        },
      ],
    },
  ];

  const rawSearch = (searchTerm || searchValue || search) as string;
  if (rawSearch && rawSearch.trim()) {
    const searchRegex = new RegExp(rawSearch.trim(), 'i');
    andConditions.push({
      $or: [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { userName: searchRegex },
        { email: searchRegex },
        { phone: searchRegex },
      ],
    });
  }

  const finalFilter = { $and: andConditions };

  const [rawParents, total] = await Promise.all([
    User.find(finalFilter)
      .select('userName role profile verified status firstName lastName email phone location createdAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    User.countDocuments(finalFilter),
  ]);

  const parentIds = rawParents.map((p: any) => p._id);

  // 1. Fetch child players for all parents
  const childPlayers = await User.find({
    parentId: { $in: parentIds },
    role: { $in: [USER_ROLES.PLAYER, USER_ROLES.OTHER_CLUBS, USER_ROLES.TOURNAMENT_PLAYER] },
  })
    .populate('selectTeam', 'teamName shortName teamLogo')
    .select('firstName lastName userName position ageGroup dateOfBirth selectTeam status verified profile engCoine marketValue parentId isSubscribed hasAccess')
    .lean();

  // 2. Fetch active subscriptions for parents and ALL individual child players
  const allUserIds = [...parentIds, ...childPlayers.map((c: any) => c._id)];
  const activeSubs = await Subscription.find({
    user: { $in: allUserIds },
    status: 'active',
  }).populate('package');

  const subMap = new Map();
  activeSubs.forEach((sub: any) => {
    subMap.set(sub.user.toString(), sub);
  });

  const childMap = new Map();
  childPlayers.forEach((cp: any) => {
    const pId = cp.parentId?.toString();
    if (pId) {
      if (!childMap.has(pId)) {
        childMap.set(pId, []);
      }
      const childSub = subMap.get(cp._id.toString());
      const childObj = {
        ...cp,
        isPaid: Boolean(childSub || cp.isSubscribed || cp.hasAccess),
        subscription: childSub ? {
          _id: childSub._id,
          status: childSub.status,
          price: childSub.price,
          trxId: childSub.trxId,
          subscriptionId: childSub.subscriptionId,
          currentPeriodStart: childSub.currentPeriodStart,
          currentPeriodEnd: childSub.currentPeriodEnd,
          packageName: (childSub.package as any)?.title || (childSub.package as any)?.name || 'ENG Subscription',
          packageDetails: childSub.package || null,
        } : null,
      };
      childMap.get(pId).push(childObj);
    }
  });

  const result = rawParents.map((p: any) => {
    const pChildren = childMap.get(p._id.toString()) || [];
    const directSub = subMap.get(p._id.toString());
    const paidChildrenCount = pChildren.filter((c: any) => c.isPaid).length;

    return {
      ...p,
      myPlayers: pChildren,
      children: pChildren,
      childrenCount: pChildren.length,
      paidChildrenCount,
      isPaid: Boolean(directSub || paidChildrenCount > 0),
      subscription: directSub ? {
        _id: directSub._id,
        status: directSub.status,
        price: directSub.price,
        trxId: directSub.trxId,
        subscriptionId: directSub.subscriptionId,
        currentPeriodStart: directSub.currentPeriodStart,
        currentPeriodEnd: directSub.currentPeriodEnd,
        packageName: (directSub.package as any)?.title || (directSub.package as any)?.name || 'ENG Subscription',
        packageDetails: directSub.package || null,
      } : null,
    };
  });

  return {
    meta: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPage: Math.ceil(total / limitNum) || 1,
    },
    result,
  };
};

// ASSIGN TEAM TO USER / PLAYER BY ADMIN
const assignTeamToUserToDB = async (userId: string, selectTeam: string | null) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found');
  }

  const updated = await User.findByIdAndUpdate(
    userId,
    { $set: { selectTeam: selectTeam || null } },
    { new: true }
  ).populate('selectTeam', 'teamName shortName teamLogo');

  return updated;
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
      role: {
        $in: [
          USER_ROLES.PLAYER,
          USER_ROLES.OTHER_CLUBS,
          USER_ROLES.TOURNAMENT_PLAYER,
        ],
      },
      _id: { $in: activeSubUserIds },
      $or: [
        { parentId: { $ne: null } },
        { position: { $exists: true, $ne: null } },
        { dateOfBirth: { $exists: true, $ne: null } },
        { ageGroup: { $exists: true, $ne: null } },
        { selectTeam: { $exists: true, $ne: null } },
        { email: null },
        { password: null },
      ],
    }
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
      role: { $nin: [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN, USER_ROLES.MANAGER, USER_ROLES.REFEREE] },
      position: { $exists: false },
      dateOfBirth: { $exists: false },
    }),
    User.countDocuments({
      role: { $in: [USER_ROLES.PLAYER, USER_ROLES.OTHER_CLUBS, USER_ROLES.TOURNAMENT_PLAYER] },
      _id: { $in: activeSubUserIds },
      $or: [
        { parentId: { $ne: null } },
        { position: { $exists: true, $ne: null } },
        { dateOfBirth: { $exists: true, $ne: null } },
        { ageGroup: { $exists: true, $ne: null } },
        { selectTeam: { $exists: true, $ne: null } },
        { email: null },
        { password: null },
      ],
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
    User.countDocuments({ status: "APPROVED", role: USER_ROLES.OTHER_CLUBS }),
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
    User.countDocuments({ status: "APPROVED", role: USER_ROLES.OTHER_CLUBS }),
    User.countDocuments({ status: "APPROVED", role: USER_ROLES.TOURNAMENT_PLAYER }),
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

// GET INCOMPLETE / UNVERIFIED / ABANDONED USERS (FOR ADMIN REMOVAL)
const getIncompleteUsersFromDB = async (query: Record<string, any>) => {
  const queryObj = { ...query };
  const { page = 1, limit = 10, pageNumber, userPage, searchTerm, searchValue, search } = queryObj;

  const pageNum = Number(pageNumber || userPage || page) || 1;
  const limitNum = Number(limit) || 10;
  const skip = (pageNum - 1) * limitNum;

  // Active subscription user IDs
  const activeSubUserIds = await Subscription.find({ status: 'active' }).distinct('user');

  // Parents who have at least one child player
  const parentIdsWithChildren = await User.find({
    parentId: { $exists: true, $ne: null },
  }).distinct('parentId');

  // Incomplete / Broken / Abandoned user conditions:
  // 1) verified: false (Email OTP unverified)
  // 2) Parent/User with email, no parentId, not in parentIdsWithChildren, no active sub, no child players
  // 3) Manager or Referee with missing DOB or missing documents
  const incompleteConditions = [
    { verified: false },
    {
      role: { $nin: [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN, USER_ROLES.MANAGER, USER_ROLES.REFEREE] },
      parentId: null,
      email: { $exists: true, $ne: null },
      _id: { $nin: [...activeSubUserIds, ...parentIdsWithChildren] },
      isSubscribed: { $ne: true },
      hasAccess: { $ne: true },
      dateOfBirth: null,
      position: null,
    },
    {
      role: USER_ROLES.MANAGER,
      $or: [
        { dateOfBirth: null },
        { document: { $in: [null, [], ""] } },
      ],
    },
    {
      role: USER_ROLES.REFEREE,
      $or: [
        { dateOfBirth: null },
        { document: { $in: [null, [], ""] } },
      ],
    },
  ];

  const andConditions: any[] = [
    {
      role: { $nin: [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN] },
      $or: incompleteConditions,
    },
  ];

  const rawSearch = (searchTerm || searchValue || search) as string;
  if (rawSearch && rawSearch.trim()) {
    const searchRegex = new RegExp(rawSearch.trim(), 'i');
    andConditions.push({
      $or: [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { userName: searchRegex },
        { email: searchRegex },
        { phone: searchRegex },
      ],
    });
  }

  const finalFilter = { $and: andConditions };

  const [rawUsers, total] = await Promise.all([
    User.find(finalFilter)
      .select('userName role profile verified status document firstName lastName email phone location createdAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    User.countDocuments(finalFilter),
  ]);

  const result = rawUsers.map((u: any) => {
    let reason = "Incomplete Registration Setup";
    if (u.verified === false) {
      reason = "Unverified Email / Abandoned Signup";
    } else if (u.role === USER_ROLES.MANAGER) {
      reason = "Manager Missing Verification Documents";
    } else if (u.role === USER_ROLES.REFEREE) {
      reason = "Referee Missing Verification Documents";
    } else if (!u.parentId) {
      reason = "Parent Profile - No Child Linked";
    }

    return {
      ...u,
      incompleteReason: reason,
    };
  });

  return {
    meta: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPage: Math.ceil(total / limitNum) || 1,
    },
    result,
  };
};

// UPDATE PLAYER JERSEY NUMBER BY ADMIN
const updateJerseyNumberToDB = async (userId: string, jerseyNumber: string | null) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found');
  }

  const updated = await User.findByIdAndUpdate(
    userId,
    { $set: { jerseyNumber: jerseyNumber ? jerseyNumber.toString().trim() : null } },
    { new: true }
  );

  return updated;
};

export const UserManagementService = {
  getAllUsersFromDB,
  getAllParentsFromDB,
  getIncompleteUsersFromDB,
  assignTeamToUserToDB,
  updateJerseyNumberToDB,
  toggleVerifiedToDB,
  deleteUserFromDB,
  getAllRefereesFromDB,
  getAllManagersFromDB,
  getUserAnalyticsFromDB,
  updateUserRoleToDB,
  updateUserProfileByAdminToDB,
};