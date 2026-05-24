import { Match } from "../match/match.model";
import { MatchPlayerSelection } from "./matchPlayerSelection.model";

// CREATE
const createSelectionIntoDB = async (payload: any) => {
  const result = await MatchPlayerSelection.create(payload);
  return result;
};

// GET (by match)
const getSelectionsFromDB = async (matchId: string) => {
  // 1. Get match with teams
  const match = await Match.findById(matchId)
    .populate("homeTeam")
    .populate("awayTeam");

  if (!match) {
    throw new Error("Match not found");
  }

  // 2. Get all selections for this match
  const selections = await MatchPlayerSelection.find({ match: matchId })
    .populate("player")
    .populate("team");

  // 3. Helper to group by team
  const buildTeamData = (teamId: string) => {
    const players = selections
      .filter(
        (s) => s.team && s.team._id.toString() === teamId
      )
      .map((s) => ({
        player: s.player,
        position: s.position,
      }));

    return players;
  };

  // 4. Response structure
  const response = {
    match,
    homeTeam: {
      team: match.homeTeam,
      players: buildTeamData(match.homeTeam._id.toString()),
    },
    awayTeam: {
      team: match.awayTeam,
      players: buildTeamData(match.awayTeam._id.toString()),
    },
  };

  return response;
};

// GET ALL
const getAllSelectionsFromDB = async () => {
  const result = await MatchPlayerSelection.find()
    .populate("match")
    .populate("team")
    .populate("player");

  return result;
};

// GET SINGLE
const getSingleSelectionFromDB = async (id: string) => {
  const result = await MatchPlayerSelection.findById(id)
    .populate("match")
    .populate("team")
    .populate("player");

  return result;
};

// DELETE
const deleteSelectionFromDB = async (id: string) => {
  const result = await MatchPlayerSelection.findByIdAndDelete(id);
  return result;
};

export const MatchPlayerSelectionService = {
  createSelectionIntoDB,
  getSelectionsFromDB,
  getAllSelectionsFromDB,
  getSingleSelectionFromDB,
  deleteSelectionFromDB
};