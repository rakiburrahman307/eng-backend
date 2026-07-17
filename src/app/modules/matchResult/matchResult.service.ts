import { MatchResult } from "./matchResult.model";
import { PlayerStats } from "../playerStats/playerStats.model";

import { StatusCodes } from "http-status-codes";
import QueryBuilder from "../../../util/queryBuilder";
import ApiError from "../../../errors/ApiErrors";
import { Match } from "../match/match.model";
import { Team } from "../team/team.model";
import { UserDetails } from "../user/userDetails.model";
import { PlayerEconomy } from "../coinAndBudget/playerEconomySchema.model";
import { ClubEconomy } from "../coinAndBudget/clubEconomySchema.model";

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
      await UserDetails.findOneAndUpdate(
        { userId: player },
        { $inc: { engCoine: goalCoin } },
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
      await UserDetails.findOneAndUpdate(
        { userId: eventMeta.assist },
        { $inc: { engCoine: assistCoin } },
      );
    }
  }

  // ================= YELLOW CARD =================
  if (eventType === "yellow_card") {
    inc.yellowCards = 1;

    // yellowCard.coin is stored as negative (e.g. -500) in DB
    const yellowCardCoin = pe?.yellowCard?.coin ?? -500;
    const user = await UserDetails.findOne({ userId: player });
    if (user) {
      const newCoins = Math.max(0, (user.engCoine ?? 0) + yellowCardCoin);
      await UserDetails.findOneAndUpdate(
        { userId: player },
        { $set: { engCoine: newCoins } },
      );
    }
  }

  // ================= RED CARD =================
  if (eventType === "red_card") {
    inc.redCards = 1;

    // redCard.coin is stored as negative (e.g. -5000) in DB
    const redCardCoin = pe?.redCard?.coin ?? -5000;
    const user = await UserDetails.findOne({ userId: player });
    if (user) {
      const newCoins = Math.max(0, (user.engCoine ?? 0) + redCardCoin);
      await UserDetails.findOneAndUpdate(
        { userId: player },
        { $set: { engCoine: newCoins } },
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

      // Rollback goal coins — reverse of what was added
      const goalCoin = pe?.goal?.coin ?? 2000;
      const user = await UserDetails.findOne({ userId: player });
      if (user) {
        const newCoins = Math.max(0, (user.engCoine ?? 0) - goalCoin);
        await UserDetails.findOneAndUpdate(
          { userId: player },
          { $set: { engCoine: newCoins } },
        );
      }
    }

    // Rollback Assist
    if (eventMeta?.assist) {
      await PlayerStats.findOneAndUpdate(
        { player: eventMeta.assist },
        { $inc: { assists: -1 } },
      );

      // Rollback assist coins
      const assistCoin = pe?.assist?.coin ?? 1000;
      const assistUser = await UserDetails.findOne({ userId: eventMeta.assist });
      if (assistUser) {
        const newCoins = Math.max(0, (assistUser.engCoine ?? 0) - assistCoin);
        await UserDetails.findOneAndUpdate(
          { userId: eventMeta.assist },
          { $set: { engCoine: newCoins } },
        );
      }
    }
  }

  // ================= YELLOW CARD =================
  if (eventType === "yellow_card") {
    inc.yellowCards = -1;

    // yellowCard.coin is negative — rollback by adding back absolute value
    const yellowCardCoin = Math.abs(pe?.yellowCard?.coin ?? -500);
    await UserDetails.findOneAndUpdate(
      { userId: player },
      { $inc: { engCoine: yellowCardCoin } },
    );
  }

  // ================= RED CARD =================
  if (eventType === "red_card") {
    inc.redCards = -1;

    // redCard.coin is negative — rollback by adding back absolute value
    const redCardCoin = Math.abs(pe?.redCard?.coin ?? -5000);
    await UserDetails.findOneAndUpdate(
      { userId: player },
      { $inc: { engCoine: redCardCoin } },
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
// 🔥 MATCH SCORE LOGIC (NEW)
// ============================================================
const applyMatchScore = async (payload: any) => {
  const { match, team, eventType, eventMeta } = payload;

  if (eventType !== "goal") return;

  const matchData = await Match.findById(match);
  if (!matchData) return;

  // ❌ own goal হলে score reverse team এ যাবে
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
// 🔥 WINNER UPDATE (NEW)
// ============================================================
const updateMatchWinner = async (matchId: any) => {
  const match = await Match.findById(matchId);
  if (!match) return;

  let winnerTeam = null;

  const homeTeamId = match.homeTeam;
  const awayTeamId = match.awayTeam;
  const homeScore = match.homeScore;
  const awayScore = match.awayScore;

  // 🟢 WIN CONDITION
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
  // 💰 COIN DISTRIBUTION LOGIC
  // ===============================

  if (homeScore === awayScore) {
    // 🔵 DRAW — both teams get drawMatch.coin
    const drawCoin = ce?.drawMatch?.coin ?? 2000;
    await Team.findByIdAndUpdate(homeTeamId, { $inc: { coin: drawCoin } });
    await Team.findByIdAndUpdate(awayTeamId, { $inc: { coin: drawCoin } });
    return;
  }

  // 🟢 WIN — winner gets winMatch.coin
  const winCoin = ce?.winMatch?.coin ?? 5000;
  await Team.findByIdAndUpdate(winnerTeam, { $inc: { coin: winCoin } });
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
