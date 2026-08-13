import { User } from "../user/user.model";
import { Team } from "../team/team.model";
import { Match } from "../match/match.model";
import { Subscription } from "../subscription/subscription.model";
import { USER_ROLES } from "../../../enums/user";

const getOverviewFromDB = async () => {
  const activeSubUserIds = await Subscription.distinct('user', {
    status: 'active',
  });

  const playerRoles = [
    USER_ROLES.PLAYER,
    USER_ROLES.OTHER_CLUBS,
    USER_ROLES.TOURNAMENT_PLAYER,
  ];

  const playerEligibility = {
    role: { $in: playerRoles },
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
  };

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
    User.countDocuments(playerEligibility),

    User.countDocuments({
      ...playerEligibility,
      status: 'PENDING',
    }),

    User.countDocuments({
      role: USER_ROLES.MANAGER,
    }),

    User.countDocuments({
      role: USER_ROLES.REFEREE,
    }),

    User.countDocuments({
      ...playerEligibility,
      role: USER_ROLES.OTHER_CLUBS,
    }),

    User.countDocuments({
      role: { $in: playerRoles },
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

    Match.countDocuments({
      status: 'upcoming',
    }),

    Subscription.countDocuments({
      status: 'active',
    }),
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