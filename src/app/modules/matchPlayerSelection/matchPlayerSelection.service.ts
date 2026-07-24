import ApiError from "../../../errors/ApiErrors";
import { MatchPlayerSelection } from "./matchPlayerSelection.model";
import { Team } from "../team/team.model";
import { sendNotification } from "../../../helpers/notificationsHelper";
import { NOTIFICATION_TYPE } from "../notification/notification.interface";

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

  const result = await MatchPlayerSelection.create({
    match,
    team,
    teamFormation,
    players: players.map((p: any) => ({
      player: p.player,
      position: p.position,
      positionIndex: p.positionIndex,
      substitute: p.substitute ?? false,
    })),
  });

  // Get Team info
  const teamData = await Team.findById(team);
  const teamName = teamData?.teamName || "your team";

  // 🔔 Send notification to selected players
  for (const p of players) {
    if (p.player) {
      await sendNotification({
        receiver: p.player.toString(),
        title: "You are Selected! 🏃‍♂️",
        message: `You have been selected to play as a ${p.position} ${p.substitute ? "(Substitute)" : "(Starting Lineup)"} for ${teamName} in the upcoming match.`,
        type: NOTIFICATION_TYPE.GENERAL,
        metadata: { matchId: match, selectionId: result._id },
      });
    }
  }

  return result;
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
  const result = await MatchPlayerSelection.find()
    .populate({
      path: "players.player",
      model: "User",
      select: "_id profile firstName lastName",
    })
    .lean();

  if (!result.length) return [];

  // STEP 5: merge both User + UserDetails
  const formattedResult = result.map((match: any) => ({
    ...match,
    players: match.players.map((p: any) => {
      const user = p.player;

      return {
        position: p.position,
        substitute: p.substitute,
        positionIndex: p.positionIndex,

        // ✅ FLAT OUTPUT (NO nested object)
        _id: user?._id,
        profile: user?.profile,
        firstName: user?.firstName,
        lastName: user?.lastName,
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
      select: "_id profile firstName lastName",
    })
    .lean();

  const result = resultArr[0];

  if (!result) {
    throw new ApiError(404, "No players found for this match and team");
  }

  // STEP 5: FORMAT RESPONSE
  const formattedResult = {
    ...result,

    // 👇 ensure always present
    teamFormation: result.teamFormation || "4-4-2",

    players: result.players.map((p: any) => {
      const user = p.player;

      return {
        position: p.position,
        substitute: p.substitute,
        positionIndex: p.positionIndex,

        _id: user?._id,
        profile: user?.profile,
        firstName: user?.firstName || null,
        lastName: user?.lastName || null,
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
