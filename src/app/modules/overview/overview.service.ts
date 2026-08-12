import { User } from "../user/user.model";
import { Team } from "../team/team.model";
import { Match } from "../match/match.model";
import { Subscription } from "../subscription/subscription.model";
import { USER_ROLES } from "../../../enums/user";

const getOverviewFromDB = async () => {
  // ✅ Child players  = PLAYER role with parentId set (created by a parent account)
  // ✅ Parent accounts = PLAYER/OTHER_CLUBS role with NO parentId themselves

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
      role: USER_ROLES.PLAYER,
      parentId: { $exists: true, $ne: null },
    }),

    // Pending approval players
    User.countDocuments({
      role: USER_ROLES.PLAYER,
      parentId: { $exists: true, $ne: null },
      status: 'PENDING',
    }),

    User.countDocuments({ role: USER_ROLES.MANAGER }),

    User.countDocuments({ role: USER_ROLES.REFEREE }),

    // Trial / Other club child players (under a parent)
    User.countDocuments({
      role: USER_ROLES.OTHER_CLUBS,
      parentId: { $exists: true, $ne: null },
    }),

    // Parent accounts: PLAYER/OTHER_CLUBS role with NO parentId and have an email (real accounts)
    User.countDocuments({
      role: { $in: [USER_ROLES.PLAYER, USER_ROLES.OTHER_CLUBS, USER_ROLES.TOURNAMENT_PLAYER] },
      $or: [
        { parentId: null },
        { parentId: { $exists: false } },
      ],
      email: { $exists: true, $ne: null },
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