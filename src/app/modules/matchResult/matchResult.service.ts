import { MatchResult } from "./matchResult.model";
import { PlayerStats } from "../playerStats/playerStats.model";

import { StatusCodes } from "http-status-codes";
import QueryBuilder from "../../../util/queryBuilder";
import ApiError from "../../../errors/ApiErrors";
import { Match } from "../match/match.model";
import { Team } from "../team/team.model";
import { User } from "../user/user.model";
import { PlayerEconomy } from "../coinAndBudget/playerEconomySchema.model";
import { ClubEconomy } from "../coinAndBudget/clubEconomySchema.model";
import { NotificationQueueHelper } from "../../../helpers/bullMQ/bullHelper";
import { NOTIFICATION_TYPE } from "../notification/notification.interface";

// ========================== CREATE ==========================
const createMatchResultToDB = async (payload: any) => {
  const { league, match, team, player, eventType, minute } = payload;

  // 1️⃣ VALIDATE MATCH
  const matchData = await Match.findById(match);
  if (!matchData) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Match not found");
  }

  // 2️⃣ VALIDATE LEAGUE
  if (String(matchData.league) !== String(league)) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "League mismatch for this match",
    );
  }

  // 3️⃣ VALIDATE TEAM IN MATCH
  const isTeamValid =
    String(matchData.homeTeam) === String(team) ||
    String(matchData.awayTeam) === String(team);

  if (!isTeamValid) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "Team is not part of this match",
    );
  }

  // 4️⃣ CHECK MATCH STATUS
  if (matchData.status !== "live") {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Match is not running");
  }

  // 5️⃣ TIME VALIDATION
  const now = new Date();
  const matchStart = new Date(matchData.matchDate);

  const matchEndPlusExtra = new Date(matchStart);
  matchEndPlusExtra.setHours(matchEndPlusExtra.getHours() + 2);

  if (now > matchEndPlusExtra) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "Match time expired, cannot update score",
    );
  }

  // 6️⃣ MINUTE VALIDATION
  if (minute < 0 || minute > 120) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid match minute");
  }

  // 7️⃣ CREATE EVENT
  const result = await MatchResult.create(payload);

  // 8️⃣ UPDATE MATCH SCORE
  await applyMatchScore(payload);

  // 9️⃣ UPDATE PLAYER STATS
  await applyPlayerStats(payload);

  // 🔟 UPDATE WINNER
  await updateMatchWinner(match);

  // 11️⃣ SEND QUEUED NOTIFICATIONS TO PLAYERS
  try {
    const eventMeta = payload.eventMeta;

    if (player) {
      let title = "Match Event Update";
      let message = `A new event occurred at minute ${minute}.`;

      if (eventType === "goal") {
        if (eventMeta?.goalType === "own_goal") {
          title = "Own Goal ⚽";
          message = `An own goal was recorded at minute ${minute}.`;
        } else {
          title = "Goal Scored! ⚽";
          message = `Congratulations! You scored a goal at minute ${minute}.`;
        }
      } else if (eventType === "assist") {
        title = "Assist Recorded! 👟⚽";
        message = `Well done! You assisted a goal at minute ${minute}.`;
      } else if (eventType === "yellow_card") {
        title = "Yellow Card Issued 🟨";
        message = `You received a yellow card at minute ${minute}.`;
      } else if (eventType === "red_card") {
        title = "Red Card Issued 🟥";
        message = `You received a red card at minute ${minute}.`;
      } else if (eventType === "substitution") {
        if (eventMeta?.substitutionType === "in") {
          title = "Subbed In 🔄";
          message = `You were substituted in at minute ${minute}.`;
        } else if (eventMeta?.substitutionType === "out") {
          title = "Subbed Out 🔄";
          message = `You were substituted out at minute ${minute}.`;
        }
      } else if (eventType === "foul") {
        title = "Foul Committed ⚠️";
        message = `A foul was recorded for you at minute ${minute}.`;
      }

      await NotificationQueueHelper.sendNotification(
        String(player),
        message,
        title,
        NOTIFICATION_TYPE.MATCH_RESULT_PUBLISHED
      );
    }

    // Assist player notification
    if (eventType === "goal" && eventMeta?.assist) {
      await NotificationQueueHelper.sendNotification(
        String(eventMeta.assist),
        `Well done! You assisted a goal at minute ${minute}.`,
        "Assist Recorded! 👟⚽",
        NOTIFICATION_TYPE.MATCH_RESULT_PUBLISHED
      );
    }
  } catch (error) {
    console.error("❌ Failed to send match result notifications:", error);
  }

  return result;
};

// ========================== GET ALL ==========================
const getAllMatchResultsFromDB = async (query: Record<string, any>) => {
  const matchQuery = new QueryBuilder(MatchResult.find(), query)
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await matchQuery.modelQuery
    .populate("match")
    .populate("team")
    .populate("player")
    .populate("addedBy");

  const meta = await matchQuery.getPaginationInfo();

  return { meta, result };
};

// ========================== SINGLE ==========================
const getSingleMatchResultFromDB = async (id: string) => {
  const result = await MatchResult.findById(id)
    .populate("match")
    .populate("team")
    .populate("player")
    .populate("addedBy");

  if (!result) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Match event not found");
  }

  return result;
};

// ========================== UPDATE ==========================
const updateMatchResultToDB = async (id: string, payload: any) => {
  const existing = await MatchResult.findById(id);

  if (!existing) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Match event not found");
  }

  // rollback old
  await rollbackPlayerStats(existing);
  await rollbackMatchScore(existing);

  const updated = await MatchResult.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  });

  if (updated) {
    await applyPlayerStats(updated);
    await applyMatchScore(updated);
    await updateMatchWinner(updated.match);
  }

  return updated;
};

// ========================== DELETE ==========================
const deleteMatchResultFromDB = async (id: string) => {
  const existing = await MatchResult.findById(id);

  if (!existing) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Match event not found");
  }

  await rollbackPlayerStats(existing);
  await rollbackMatchScore(existing);

  const deleted = await MatchResult.findByIdAndDelete(id);

  await updateMatchWinner(existing.match);

  return deleted;
};

// ========================== MATCH WISE ==========================
const getMatchWiseResultsFromDB = async (matchId: string) => {
  return await MatchResult.find({ match: matchId })
    .populate("team")
    .populate("player")
    .populate("addedBy")
    .sort({ minute: 1 });
};

// ============================================================
// 🔥 PLAYER STATS
// ============================================================
const applyPlayerStats = async (payload: any) => {
  const { player, team, eventType, eventMeta } = payload;

  if (!player) return;

  // Fetch PlayerEconomy config from DB (fallback to defaults if not configured)
  const pe = await PlayerEconomy.findOne();

  const inc: any = {};

  // ================= GOAL =================
  if (eventType === "goal") {
    if (eventMeta?.goalType !== "own_goal") {
      inc.goals = 1;

      // Goal Reward — dynamic from DB
      const goalCoin = pe?.goal?.coin ?? 2000;
      const goalMV = pe?.goal?.marketValue ?? 20000;
      await User.findOneAndUpdate(
        { _id: player },
        { $inc: { engCoine: goalCoin, marketValue: goalMV } },
      );
    }

    // Assist
    if (eventMeta?.assist) {
      await PlayerStats.findOneAndUpdate(
        { player: eventMeta.assist },
        { $inc: { assists: 1 }, $set: { team } },
        { upsert: true, new: true },
      );

      // Assist Reward — dynamic from DB
      const assistCoin = pe?.assist?.coin ?? 1000;
      const assistMV = pe?.assist?.marketValue ?? 10000;
      await User.findOneAndUpdate(
        { _id: eventMeta.assist },
        { $inc: { engCoine: assistCoin, marketValue: assistMV } },
      );
    }
  }

  // ================= YELLOW CARD =================
  if (eventType === "yellow_card") {
    inc.yellowCards = 1;

    // yellowCard.coin and yellowCard.marketValue are stored as negative in DB
    const yellowCardCoin = pe?.yellowCard?.coin ?? -500;
    const yellowCardMV = pe?.yellowCard?.marketValue ?? -5000;
    const user = await User.findById(player);
    if (user) {
      const newCoins = Math.max(0, (user.engCoine ?? 0) + yellowCardCoin);
      const newMV = Math.max(0, (user.marketValue ?? 0) + yellowCardMV);
      await User.findOneAndUpdate(
        { _id: player },
        { $set: { engCoine: newCoins, marketValue: newMV } },
      );
    }
  }

  // ================= RED CARD =================
  if (eventType === "red_card") {
    inc.redCards = 1;

    // redCard.coin and redCard.marketValue are stored as negative in DB
    const redCardCoin = pe?.redCard?.coin ?? -5000;
    const redCardMV = pe?.redCard?.marketValue ?? -50000;
    const user = await User.findById(player);
    if (user) {
      const newCoins = Math.max(0, (user.engCoine ?? 0) + redCardCoin);
      const newMV = Math.max(0, (user.marketValue ?? 0) + redCardMV);
      await User.findOneAndUpdate(
        { _id: player },
        { $set: { engCoine: newCoins, marketValue: newMV } },
      );
    }
  }

  if (Object.keys(inc).length > 0) {
    await PlayerStats.findOneAndUpdate(
      { player },
      { $inc: inc, $set: { team } },
      { upsert: true, new: true },
    );
  }
};

const rollbackPlayerStats = async (payload: any) => {
  const { player, eventType, eventMeta } = payload;

  if (!player) return;

  // Fetch PlayerEconomy config from DB for rollback reversal
  const pe = await PlayerEconomy.findOne();

  const inc: any = {};

  // ================= GOAL =================
  if (eventType === "goal") {
    if (eventMeta?.goalType !== "own_goal") {
      inc.goals = -1;

      // Rollback goal coins and market value
      const goalCoin = pe?.goal?.coin ?? 2000;
      const goalMV = pe?.goal?.marketValue ?? 20000;
      const user = await User.findById(player);
      if (user) {
        const newCoins = Math.max(0, (user.engCoine ?? 0) - goalCoin);
        const newMV = Math.max(0, (user.marketValue ?? 0) - goalMV);
        await User.findOneAndUpdate(
          { _id: player },
          { $set: { engCoine: newCoins, marketValue: newMV } },
        );
      }
    }

    // Rollback Assist
    if (eventMeta?.assist) {
      await PlayerStats.findOneAndUpdate(
        { player: eventMeta.assist },
        { $inc: { assists: -1 } },
      );

      // Rollback assist coins and market value
      const assistCoin = pe?.assist?.coin ?? 1000;
      const assistMV = pe?.assist?.marketValue ?? 10000;
      const assistUser = await User.findById(eventMeta.assist);
      if (assistUser) {
        const newCoins = Math.max(0, (assistUser.engCoine ?? 0) - assistCoin);
        const newMV = Math.max(0, (assistUser.marketValue ?? 0) - assistMV);
        await User.findOneAndUpdate(
          { _id: eventMeta.assist },
          { $set: { engCoine: newCoins, marketValue: newMV } },
        );
      }
    }
  }

  // ================= YELLOW CARD =================
  if (eventType === "yellow_card") {
    inc.yellowCards = -1;

    // yellowCard.coin is negative — rollback by adding back absolute value
    const yellowCardCoin = Math.abs(pe?.yellowCard?.coin ?? -500);
    const yellowCardMV = Math.abs(pe?.yellowCard?.marketValue ?? -5000);
    await User.findOneAndUpdate(
      { _id: player },
      { $inc: { engCoine: yellowCardCoin, marketValue: yellowCardMV } },
    );
  }

  // ================= RED CARD =================
  if (eventType === "red_card") {
    inc.redCards = -1;

    // redCard.coin is negative — rollback by adding back absolute value
    const redCardCoin = Math.abs(pe?.redCard?.coin ?? -5000);
    const redCardMV = Math.abs(pe?.redCard?.marketValue ?? -50000);
    await User.findOneAndUpdate(
      { _id: player },
      { $inc: { engCoine: redCardCoin, marketValue: redCardMV } },
    );
  }

  if (Object.keys(inc).length > 0) {
    await PlayerStats.findOneAndUpdate(
      { player },
      { $inc: inc },
    );
  }
};

// ============================================================
// MATCH SCORE LOGIC (NEW)
// ============================================================
const applyMatchScore = async (payload: any) => {
  const { match, team, eventType, eventMeta } = payload;

  if (eventType !== "goal") return;

  const matchData = await Match.findById(match);
  if (!matchData) return;

  // own goal হলে score reverse team এ যাবে
  const isOwnGoal = eventMeta?.goalType === "own_goal";

  let scoringTeam = team;

  if (isOwnGoal) {
    scoringTeam =
      String(matchData.homeTeam) === String(team)
        ? matchData.awayTeam
        : matchData.homeTeam;
  }

  if (String(matchData.homeTeam) === String(scoringTeam)) {
    await Match.findByIdAndUpdate(match, {
      $inc: { homeScore: 1 },
    });
  }

  if (String(matchData.awayTeam) === String(scoringTeam)) {
    await Match.findByIdAndUpdate(match, {
      $inc: { awayScore: 1 },
    });
  }
};

const rollbackMatchScore = async (payload: any) => {
  const { match, team, eventType, eventMeta } = payload;

  if (eventType !== "goal") return;

  const matchData = await Match.findById(match);
  if (!matchData) return;

  const isOwnGoal = eventMeta?.goalType === "own_goal";

  let scoringTeam = team;

  if (isOwnGoal) {
    scoringTeam =
      String(matchData.homeTeam) === String(team)
        ? matchData.awayTeam
        : matchData.homeTeam;
  }

  if (String(matchData.homeTeam) === String(scoringTeam)) {
    await Match.findByIdAndUpdate(match, {
      $inc: { homeScore: -1 },
    });
  }

  if (String(matchData.awayTeam) === String(scoringTeam)) {
    await Match.findByIdAndUpdate(match, {
      $inc: { awayScore: -1 },
    });
  }
};

// ============================================================
//  WINNER UPDATE (NEW)
// ============================================================
const updateMatchWinner = async (matchId: any) => {
  const match = await Match.findById(matchId);
  if (!match) return;

  let winnerTeam = null;

  const homeTeamId = match.homeTeam;
  const awayTeamId = match.awayTeam;
  const homeScore = match.homeScore;
  const awayScore = match.awayScore;

  // WIN CONDITION
  if (homeScore > awayScore) {
    winnerTeam = homeTeamId;
  } else if (awayScore > homeScore) {
    winnerTeam = awayTeamId;
  }

  // Update match winner
  await Match.findByIdAndUpdate(matchId, { winnerTeam });

  // Fetch ClubEconomy config from DB for coin distribution
  const ce = await ClubEconomy.findOne();

  // ===============================
  //  COIN DISTRIBUTION LOGIC
  // ===============================

  if (homeScore === awayScore) {
    // 🔵 DRAW — both teams get drawMatch.coin and (drawMatch.coin * 100) market value
    const drawCoin = ce?.drawMatch?.coin ?? 2000;
    const drawMV = drawCoin * 100;
    await Team.findByIdAndUpdate(homeTeamId, { $inc: { coin: drawCoin, marketValue: drawMV } });
    await Team.findByIdAndUpdate(awayTeamId, { $inc: { coin: drawCoin, marketValue: drawMV } });
    return;
  }

  // 🟢 WIN — winner gets winMatch.coin and (winMatch.coin * 100) market value
  const winCoin = ce?.winMatch?.coin ?? 5000;
  const winMV = winCoin * 100;
  await Team.findByIdAndUpdate(winnerTeam, { $inc: { coin: winCoin, marketValue: winMV } });
};

// ============================================================
export const MatchResultService = {
  createMatchResultToDB,
  getAllMatchResultsFromDB,
  getSingleMatchResultFromDB,
  updateMatchResultToDB,
  deleteMatchResultFromDB,
  getMatchWiseResultsFromDB,
};
