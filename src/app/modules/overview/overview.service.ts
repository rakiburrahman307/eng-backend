import { User } from "../user/user.model";
import { Team } from "../team/team.model";
import { Match } from "../match/match.model";
import { USER_ROLES } from "../../../enums/user";

const getOverviewFromDB = async () => {
  const [
    totalPlayers,
    totalManagers,
    totalReferees,
    totalOutclubPlayers,
    totalTeams,
    totalMatches,
    pendingMatches,
  ] = await Promise.all([
    User.countDocuments({ role: USER_ROLES.PLAYER }),
    User.countDocuments({ role: USER_ROLES.MANAGER }),
    User.countDocuments({ role: USER_ROLES.REFEREE }),

    // ⚠️ adjust this condition based on your DB logic
    User.countDocuments({ role: USER_ROLES.OTHER_CLUBS }),

    Team.countDocuments(),

    Match.countDocuments(),

    Match.countDocuments({ status: "upcoming" }),
  ]);

  return {
    users: {
      totalPlayers,
      totalManagers,
      totalReferees,
      totalOutclubPlayers,
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