import { Team } from "../team/team.model";
import { MatchEvaluation } from "./refereeRating.model";

// Rating (1-100) -> Coin Reward
const getConductReward = (rating: number): number => {
  if (rating >= 90) return 2500;      // 90-100
  if (rating >= 80) return 1500;      // 80-89
  if (rating >= 60) return 500;       // 60-79
  if (rating >= 50) return 0;         // 50-59
  if (rating >= 30) return -1000;     // 30-49
  return -3000;                       // 0-29
};
// CREATE EVALUATION

const createEvaluationIntoDB = async (payload: any) => {

  const result = await MatchEvaluation.create(payload);

  const teams = [
    {
      teamId: payload.homeTeam,
      rating: Number(payload.homeTeamConductRating),
    },
    {
      teamId: payload.awayTeam,
      rating: Number(payload.awayTeamConductRating),
    },
  ];


  for (const item of teams) {
    if (!item.teamId || item.rating == null) continue;

    const coin = getConductReward(item.rating);

    await Team.findByIdAndUpdate(item.teamId, {
      $inc: {
        coin,
      },
    });
  }

  return result;
};

// GET ALL
const getAllEvaluationsFromDB = async () => {
  return await MatchEvaluation.find()
    .populate('match')
    .populate('referee', 'name email')
    .populate('homeTeam', 'teamName teamLogo')
    .populate('awayTeam', 'teamName teamLogo')
    .populate('manOfTheMatch', 'name image')
    .populate('winningTeam', 'teamName teamLogo');
};

// GET SINGLE
const getSingleEvaluationFromDB = async (id: string) => {
  return await MatchEvaluation.findById(id)
    .populate('match')
    .populate('referee', 'name email')
    .populate('homeTeam', 'teamName teamLogo')
    .populate('awayTeam', 'teamName teamLogo')
    .populate('manOfTheMatch', 'name image')
    .populate('winningTeam', 'teamName teamLogo');
};

export const MatchEvaluationService = {
  createEvaluationIntoDB,
  getAllEvaluationsFromDB,
  getSingleEvaluationFromDB,
};