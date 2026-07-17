import { Team } from "../team/team.model";
import { MatchEvaluation } from "./refereeRating.model";
import { ClubEconomy } from "../coinAndBudget/clubEconomySchema.model";

// Dynamically get coin reward based on rating from ClubEconomy config
const getConductReward = async (rating: number): Promise<number> => {
  const ce = await ClubEconomy.findOne();

  if (rating >= 90) return ce?.exceptionalConduct?.coin ?? 2500;
  if (rating >= 80) return ce?.goodConduct?.coin ?? 1500;
  if (rating >= 60) return ce?.satisfactoryConduct?.coin ?? 500;
  if (rating >= 50) return ce?.averageConduct?.coin ?? 0;
  if (rating >= 30) return ce?.poorConduct?.coin ?? -1000;
  return ce?.unprofessionalConduct?.coin ?? -3000;
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

    const coin = await getConductReward(item.rating);

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