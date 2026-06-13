import ApiError from "../../../errors/ApiErrors";
import { UserDetails } from "../user/userDetails.model";
import { MatchPlayerSelection } from "./matchPlayerSelection.model";

// CREATE
const createSelectionIntoDB = async (payload: any) => {
  const { match, team, players, teamFormation } = payload;

  if (!teamFormation) {
    throw new ApiError(400, "Team formation is required");
  }

  if (!Array.isArray(players) || players.length === 0) {
    throw new ApiError(400, "Players array is required");
  }

  const unique = new Set(players.map((p: any) => p.player.toString()));
  if (unique.size !== players.length) {
    throw new ApiError(400, "Duplicate players not allowed");
  }

  return await MatchPlayerSelection.create({
    match,
    team,
    teamFormation, // ✅ ADD THIS
    players: players.map((p: any) => ({
      player: p.player,
      position: p.position,
      positionIndex: p.positionIndex,
      substitute: p.substitute ?? false,
    })),
  });
};

// GET ALL
// const getAllSelectionsFromDB = async () => {

//   const result = await MatchPlayerSelection.find()
//     .populate("match")
//     .populate("team")
//     .populate({
//       path: "players.player",
//       model: "UserDetails", // 🔥 IMPORTANT FIX
//     })
//     .lean();

//   if (!result.length) {

//     return [];
//   }

//   const formatted = result.map((item: any, itemIndex: number) => {

//     const players = (item.players || []).map((p: any, playerIndex: number) => {

//       const userDetails = p.player;

//       if (!userDetails) {

//       }

//       return {
//         _id: userDetails?._id || null,

//         firstName: userDetails?.firstName || null,
//         lastName: userDetails?.lastName || null,

//         position: p.position,
//         substitute: p.substitute,

//         profile: userDetails?.profile || null,
//       };
//     });

//     return {
//       _id: item._id,
//       match: item.match,
//       team: item.team,
//       players,
//       createdAt: item.createdAt,
//       updatedAt: item.updatedAt,
//     };
//   });

//   return formatted;
// };

const getAllSelectionsFromDB = async () => {
  // STEP 1: get selections + user IDs
  const result = await MatchPlayerSelection.find()
    .populate({
      path: "players.player",
      model: "User",
      select: "_id profile",
    })
    .lean();

  if (!result.length) return [];

  // STEP 2: collect userIds
  const userIds = result.flatMap((r: any) =>
    r.players.map((p: any) => p.player?._id),
  );

  // STEP 3: get UserDetails (name info)
  const userDetails = await UserDetails.find({
    userId: { $in: userIds },
  }).lean();

  // STEP 4: map UserDetails by userId
  const detailsMap = new Map(
    userDetails.map((d: any) => [d.userId.toString(), d]),
  );

  // STEP 5: merge both User + UserDetails
  const formattedResult = result.map((match: any) => ({
    ...match,
    players: match.players.map((p: any) => {
      const user = p.player;
      const details = detailsMap.get(user?._id?.toString());

      return {
        position: p.position,
        substitute: p.substitute,
        positionIndex: p.positionIndex,

        // ✅ FLAT OUTPUT (NO nested object)
        _id: user?._id,
        profile: user?.profile,
        firstName: details?.firstName,
        lastName: details?.lastName,
      };
    }),
  }));

  return formattedResult;
};

// GET SINGLE
const getSingleSelectionFromDB = async (id: string) => {
  const result = await MatchPlayerSelection.findById(id)
    .populate("match")
    .populate("team")
    .populate("players.player");

  if (!result) throw new ApiError(404, "Selection not found");

  return result;
};

// UPDATE
const updateSelectionIntoDB = async (id: string, payload: any) => {
  const updated = await MatchPlayerSelection.findByIdAndUpdate(
    id,
    {
      $set: {
        match: payload.match,
        team: payload.team,
        players: payload.players?.map((p: any) => ({
          player: p.player,
          position: p.position,
          positionIndex: p.positionIndex,
          substitute: p.substitute ?? false,
        })),
      },
    },
    { new: true },
  )
    .populate("match")
    .populate("team")
    .populate("players.player");

  if (!updated) throw new ApiError(404, "Selection not found");

  return updated;
};

// DELETE
const deleteSelectionFromDB = async (id: string) => {
  const deleted = await MatchPlayerSelection.findByIdAndDelete(id);

  if (!deleted) throw new ApiError(404, "Selection not found");

  return deleted;
};

const getPlayersByMatchAndTeamFromDB = async (
  matchId: string,
  teamId: string,
) => {
  if (!matchId || !teamId) {
    throw new ApiError(400, "matchId and teamId are required");
  }

  // STEP 1: GET LATEST DOCUMENT
  const resultArr = await MatchPlayerSelection.find({
    match: matchId,
    team: teamId,
  })
    .sort({ createdAt: -1 }) // 👈 latest first
    .limit(1)
    .populate({
      path: "match",
    })
    .populate({
      path: "team",
    })
    .populate({
      path: "players.player",
      model: "User",
      select: "_id profile",
    })
    .lean();

  const result = resultArr[0];

  if (!result) {
    throw new ApiError(404, "No players found for this match and team");
  }

  // STEP 2: collect userIds
  const userIds = result.players.map((p: any) => p.player?._id);

  // STEP 3: get UserDetails
  const userDetails = await UserDetails.find({
    userId: { $in: userIds },
  }).lean();

  // STEP 4: map for quick lookup
  const detailsMap = new Map(
    userDetails.map((d: any) => [d.userId.toString(), d]),
  );

  // STEP 5: FORMAT RESPONSE
  const formattedResult = {
    ...result,

    // 👇 ensure always present
    teamFormation: result.teamFormation || "4-4-2",

    players: result.players.map((p: any) => {
      const user = p.player;
      const details = detailsMap.get(user?._id?.toString());

      return {
        position: p.position,
        substitute: p.substitute,
        positionIndex: p.positionIndex,

        _id: user?._id,
        profile: user?.profile,
        firstName: details?.firstName || null,
        lastName: details?.lastName || null,
      };
    }),
  };

  return formattedResult;
};

export const MatchPlayerSelectionService = {
  createSelectionIntoDB,
  getAllSelectionsFromDB,
  getSingleSelectionFromDB,
  updateSelectionIntoDB,
  deleteSelectionFromDB,
  getPlayersByMatchAndTeamFromDB,
};
