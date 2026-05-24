import QueryBuilder from "../../../util/queryBuilder";
import { UserDetails } from "../user/userDetails.model";


const getAllPlayersFromDB = async (query: Record<string, any>) => {
  const baseQuery = UserDetails.find()
    .populate({
      path: "userId",
      select: "profile",
    })
    .populate({
      path: "selectTeam",
      select: "teamName shortName teamLogo",
    });

  const queryBuilder = new QueryBuilder(baseQuery, query)
    .search(["firstName", "lastName", "position"])
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await queryBuilder.modelQuery;

    const players = result.map((player: any) => ({
    _id: player._id,
    firstName: player.firstName,
    lastName: player.lastName,
    position: player.position,


    profile: player.userId?.profile || null,

    teamName: player.selectTeam?.teamName || null,
    shortName: player.selectTeam?.shortName || null,
    teamLogo: player.selectTeam?.teamLogo || null,
  }));

  return {
    players,
    pagination: await queryBuilder.getPaginationInfo(),
  };
};

export const PlayerService = {
  getAllPlayersFromDB,
};