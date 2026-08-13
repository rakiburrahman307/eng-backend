import { User } from "../user/user.model";
import { Team } from "../team/team.model";
import { Match } from "../match/match.model";
import { Subscription } from "../subscription/subscription.model";
import { USER_ROLES } from "../../../enums/user";

const getOverviewFromDB = async () => {
  // Active subscription user IDs for players
  const activeSubUserIds = await Subscription.find({ status: 'active' }).distinct('user');
  const [
    totalPlayers,
    totalPendingPlayers,
    totalManagers,
    totalReferees,
    totalOutclubPlayers,
    totalParents,
    totalTeams,
    totalMatches,
    pendingMatches,
    activeSubscriptions,
  ] = await Promise.all([
    // ✅ Real players = PLAYER role AND has parentId (child accounts)
    User.countDocuments({
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
    }),

    // Pending approval players
    User.countDocuments({
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
      status: 'PENDING',
    }),

    User.countDocuments({ role: USER_ROLES.MANAGER }),

    User.countDocuments({ role: USER_ROLES.REFEREE }),

    // Trial / Other club child players (under a parent)
    User.countDocuments({
      role: USER_ROLES.OTHER_CLUBS,
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
      role: {
        $in: [
          USER_ROLES.PLAYER,
          USER_ROLES.OTHER_CLUBS,
          USER_ROLES.TOURNAMENT_PLAYER,
        ],
      },
      parentId: null,
      email: {
        $exists: true,
        $ne: null,
      },
      password: {
        $exists: true,
        $ne: null,
      },
    }),

    Team.countDocuments(),

    Match.countDocuments(),

    Match.countDocuments({ status: "upcoming" }),

    // Active subscriptions across all users
    Subscription.countDocuments({ status: 'active' }),
  ]);

  return {
    users: {
      totalPlayers,
      totalPendingPlayers,
      totalManagers,
      totalReferees,
      totalOutclubPlayers,
      totalParents,
      activeSubscriptions,
    },
    teams: {
      totalTeams,
    },
    matches: {
      totalMatches,
      pendingMatches,
    },
  };
};

export const OverviewService = {
  getOverviewFromDB,
};