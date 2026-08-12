import { Team } from "../team/team.model";
import { MatchEvaluation } from "./refereeRating.model";
import { ClubEconomy } from "../coinAndBudget/clubEconomySchema.model";

// Dynamically get coin and market value reward based on rating from ClubEconomy config
const getConductReward = async (rating: number): Promise<{ coin: number; budgetValue: number }> => {
  const ce = await ClubEconomy.findOne();

  if (rating >= 90) {
    return {
      coin: ce?.exceptionalConduct?.coin ?? 2500,
      budgetValue: ce?.exceptionalConduct?.budgetValue ?? 25000,
    };
  }
  if (rating >= 80) {
    return {
      coin: ce?.goodConduct?.coin ?? 1500,
      budgetValue: ce?.goodConduct?.budgetValue ?? 15000,
    };
  }
  if (rating >= 60) {
    return {
      coin: ce?.satisfactoryConduct?.coin ?? 500,
      budgetValue: ce?.satisfactoryConduct?.budgetValue ?? 5000,
    };
  }
  if (rating >= 50) {
    return {
      coin: ce?.averageConduct?.coin ?? 0,
      budgetValue: ce?.averageConduct?.budgetValue ?? 0,
    };
  }
  if (rating >= 30) {
    return {
      coin: ce?.poorConduct?.coin ?? -1000,
      budgetValue: ce?.poorConduct?.budgetValue ?? -10000,
    };
  }
  return {
    coin: ce?.unprofessionalConduct?.coin ?? -3000,
    budgetValue: ce?.unprofessionalConduct?.budgetValue ?? -30000,
  };
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

    const { coin, budgetValue } = await getConductReward(item.rating);

    await Team.findByIdAndUpdate(item.teamId, {
      $inc: {
        coin,
        marketValue: budgetValue,
      },
    });
  }

  // 🏆 Reward Man of the Match / Player of the Day
  if (payload.manOfTheMatch) {
    try {
      const { PlayerEconomy } = await import("../coinAndBudget/playerEconomySchema.model");
      const { User } = await import("../user/user.model");
      const { PlayerStats } = await import("../playerStats/playerStats.model");
      const { NotificationQueueHelper } = await import("../../../helpers/bullMQ/bullHelper");
      const { NOTIFICATION_TYPE } = await import("../notification/notification.interface");

      const pe = await PlayerEconomy.findOne();
      const potdCoin = pe?.playerOfTheDay?.coin ?? 5000;
      const potdMV = pe?.playerOfTheDay?.marketValue ?? 50000;

      await User.findByIdAndUpdate(payload.manOfTheMatch, {
        $inc: {
          engCoine: potdCoin,
          marketValue: potdMV,
        },
      });

      await PlayerStats.findOneAndUpdate(
        { player: payload.manOfTheMatch },
        { $inc: { playerOfTheDay: 1 } },
        { upsert: true, new: true }
      );

      await NotificationQueueHelper.sendNotification(
        String(payload.manOfTheMatch),
        "Congratulations! You were awarded Player of the Day / Man of the Match!",
        "Player of the Day!",
        NOTIFICATION_TYPE.MATCH_RESULT_PUBLISHED
      );
    } catch (motmErr) {
      console.error("Failed to process Man of the Match reward:", motmErr);
    }
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