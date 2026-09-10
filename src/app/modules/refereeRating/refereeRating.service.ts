import { Team } from "../team/team.model";
import { MatchEvaluation } from "./refereeRating.model";
import { ClubEconomy } from "../coinAndBudget/clubEconomySchema.model";
import { Match } from "../match/match.model";
import ApiError from "../../../errors/ApiErrors";
import { StatusCodes } from "http-status-codes";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

// Dynamically get coin and market value reward based on rating from ClubEconomy config
// Rating tiers:
// - Rating: Elite (9.0 - 10.0)
// - Rating: Great (8.0 - 8.9)
// - Rating: Good (7.0 - 7.9)
// - Below 7.0: 0 coin, 0 budget (Coins are NEVER deducted)
const getConductReward = async (rating: number): Promise<{ coin: number; budgetValue: number }> => {
  if (rating == null || isNaN(rating)) {
    return { coin: 0, budgetValue: 0 };
  }

  const ce = await ClubEconomy.findOne();

  // Normalize in case rating was passed as percentage (e.g. 85 -> 8.5)
  const r = rating > 10 ? rating / 10 : rating;

  // 10/10 - Exceptional
  if (r >= 10) {
    return {
      coin: Number(ce?.exceptionalConduct?.coin) || 0,
      budgetValue: Number(ce?.exceptionalConduct?.budgetValue) || 0,
    };
  }

  // 8-9/10 - Good
  if (r >= 8.0) {
    return {
      coin: Number(ce?.goodConduct?.coin) || 0,
      budgetValue: Number(ce?.goodConduct?.budgetValue) || 0,
    };
  }

  // 6-7/10 - Satisfactory
  if (r >= 6.0) {
    return {
      coin: Number(ce?.satisfactoryConduct?.coin) || 0,
      budgetValue: Number(ce?.satisfactoryConduct?.budgetValue) || 0,
    };
  }

  // 5/10 - Average/Neutral
  if (r >= 5.0) {
    return {
      coin: Number(ce?.averageConduct?.coin) || 0,
      budgetValue: Number(ce?.averageConduct?.budgetValue) || 0,
    };
  }

  // 3-4/10 - Poor
  if (r >= 3.0) {
    return {
      coin: Number(ce?.poorConduct?.coin) || 0,
      budgetValue: Number(ce?.poorConduct?.budgetValue) || 0,
    };
  }

  // 1-2/10 - Unprofessional
  return {
    coin: Number(ce?.unprofessionalConduct?.coin) || 0,
    budgetValue: Number(ce?.unprofessionalConduct?.budgetValue) || 0,
  };
};

// CREATE EVALUATION
const createEvaluationIntoDB = async (payload: any) => {
  if (!payload.match) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Match ID is required");
  }

  const match = await Match.findById(payload.match);
  if (!match) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Match not found");
  }

  if (match.status !== "finished") {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "Feedback can only be submitted for finished matches",
    );
  }

  // ⏰ 24-Hour Feedback Window (Europe/London UK Timezone): Feedback cannot be submitted after 24 hours of match completion
  const finishTime = match.finishedAt || (match as any).updatedAt;
  if (finishTime) {
    const nowUK = dayjs().tz("Europe/London");
    const finishUK = dayjs(finishTime).tz("Europe/London");
    const hoursSinceFinish = nowUK.diff(finishUK, "hour", true);
    if (hoursSinceFinish > 24) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        "Feedback cannot be submitted after 24 hours of match completion (UK Time)",
      );
    }
  }

  // Support both homeTeamRating and homeTeamConductRating from payload
  const homeRating =
    payload.homeTeamRating !== undefined
      ? payload.homeTeamRating
      : payload.homeTeamConductRating;

  const awayRating =
    payload.awayTeamRating !== undefined
      ? payload.awayTeamRating
      : payload.awayTeamConductRating;

  payload.homeTeamRating = Number(homeRating);
  payload.awayTeamRating = Number(awayRating);

  const result = await MatchEvaluation.create(payload);

  const teams = [
    {
      teamId: payload.homeTeam,
      rating: Number(homeRating),
    },
    {
      teamId: payload.awayTeam,
      rating: Number(awayRating),
    },
  ];

  for (const item of teams) {
    if (!item.teamId || item.rating == null || isNaN(item.rating)) continue;

    const { coin, budgetValue } = await getConductReward(item.rating);

    if (coin > 0 || budgetValue > 0) {
      await Team.findByIdAndUpdate(item.teamId, {
        $inc: {
          coin,
          marketValue: budgetValue,
        },
      });
    }
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
      const potdCoin = pe?.playerOfTheDay?.coin ?? 0;
      const potdMV = pe?.playerOfTheDay?.marketValue ?? 0;

      const { isUserPremiumPlayer } = await import("../../../helpers/packageHelper");
      const isPro = await isUserPremiumPlayer(payload.manOfTheMatch);

      if (isPro && (potdCoin > 0 || potdMV > 0)) {
        await User.findByIdAndUpdate(payload.manOfTheMatch, {
          $inc: {
            engCoine: potdCoin,
            marketValue: potdMV,
          },
        });
      }

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