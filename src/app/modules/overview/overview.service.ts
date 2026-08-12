import { User } from "../user/user.model";
import { Team } from "../team/team.model";
import { Match } from "../match/match.model";
import { Subscription } from "../subscription/subscription.model";
import { USER_ROLES } from "../../../enums/user";

const getOverviewFromDB = async () => {
  // Find all user IDs that are referenced as parentId — these are the parent accounts
  const parentAccountIds = await User.find({
    parentId: { $exists: true, $ne: null },
  }).distinct('parentId');

  const [
    totalPlayers,
    totalManagers,
    totalReferees,
    totalOutclubPlayers,
    totalParents,
    totalTeams,
    totalMatches,
    pendingMatches,
    activeSubscriptions,
  ] = await Promise.all([
    // Players: PLAYER role, NOT in parentAccountIds (i.e., not a parent account)
    User.countDocuments({
      role: USER_ROLES.PLAYER,
      _id: { $nin: parentAccountIds },
    }),

    User.countDocuments({ role: USER_ROLES.MANAGER }),

    User.countDocuments({ role: USER_ROLES.REFEREE }),

    // Trial / Other club players
    User.countDocuments({ role: USER_ROLES.OTHER_CLUBS }),

    // Pure parents: users who are referenced as parentId
    User.countDocuments({
      _id: { $in: parentAccountIds },
    }),

    Team.countDocuments(),

    Match.countDocuments(),

    Match.countDocuments({ status: "upcoming" }),

    // Active subscriptions across players (not parents)
    Subscription.countDocuments({ status: 'active' }),
  ]);

  return {
    users: {
      totalPlayers,
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