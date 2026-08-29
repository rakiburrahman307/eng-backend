import { MatchResult } from "./matchResult.model";
import { PlayerStats } from "../playerStats/playerStats.model";

import { StatusCodes } from "http-status-codes";
import ApiError from "../../../errors/ApiErrors";
import { Match } from "../match/match.model";
import { Team } from "../team/team.model";
import { User } from "../user/user.model";
import { League } from "../league/league.model";
import { PlayerEconomy } from "../coinAndBudget/playerEconomySchema.model";
import { ClubEconomy } from "../coinAndBudget/clubEconomySchema.model";
import { NotificationQueueHelper } from "../../../helpers/bullMQ/bullHelper";
import { NOTIFICATION_TYPE } from "../notification/notification.interface";
import { emitMatchUpdate } from "../match/match.service";

// ========================== CREATE ==========================
const createMatchResultToDB = async (payload: any) => {
  if (payload.league === "" || !payload.league) {
    delete payload.league;
  }
  const { league, match, team, player, eventType, minute } = payload;

  // 1️⃣ VALIDATE MATCH
  const matchData = await Match.findById(match);
  if (!matchData) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Match not found");
  }

  // 2️⃣ VALIDATE LEAGUE
  if (matchData.matchType === "league" && matchData.league) {
    if (String(matchData.league) !== String(league)) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        "League mismatch for this match",
      );
    }
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

  // if (now > matchEndPlusExtra) {
  //   throw new ApiError(
  //     StatusCodes.BAD_REQUEST,
  //     "Match time expired, cannot update score",
  //   );
  // }

  // Dynamic minute calculation if missing (e.g. referee live panel event)
  let eventMinute = minute;
  if (
    eventMinute === undefined ||
    eventMinute === null ||
    eventMinute === "" ||
    isNaN(Number(eventMinute)) ||
    Number(eventMinute) <= 0
  ) {
    let liveSeconds = matchData.elapsedSeconds || 0;
    if (matchData.timerStatus === "running" && matchData.timerStartedAt) {
      const diff = Math.floor(
        (Date.now() - new Date(matchData.timerStartedAt).getTime()) / 1000,
      );
      if (diff > 0) liveSeconds += diff;
    }
    eventMinute = Math.floor(liveSeconds / 60) || 1;
    payload.minute = eventMinute;
  } else {
    eventMinute = Number(eventMinute);
    payload.minute = eventMinute;
  }

  // 6️⃣ MINUTE VALIDATION
  if (eventMinute < 0 || eventMinute > 120) {
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
      } else if (eventType === "clean_sheet") {
        title = "Clean Sheet Recorded! 🧤⚽";
        message = `Great job! A clean sheet was recorded for you at minute ${minute}.`;
      } else if (eventType === "player_of_the_day") {
        title = "Player of the Day! 🏆⭐";
        message = `Congratulations! You have been named Player of the Day for this match.`;
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

  await emitMatchUpdate(match.toString());

  return result;
};

// ========================== GET ALL ==========================
const getAllMatchResultsFromDB = async (query: Record<string, any>) => {
  const { searchTerm, search, sort, page, limit, fields, ...filterKeys } = query;

  // 1. Build Filter Query
  const filterQuery: Record<string, any> = {};

  // Clean and apply other filters
  for (const key in filterKeys) {
    const val = filterKeys[key];
    if (val !== undefined && val !== null && val !== "" && val !== "undefined") {
      filterQuery[key] = val;
    }
  }

  // 2. Handle Search Term
  const searchVal = searchTerm || search;
  if (searchVal) {
    const searchRegex = new RegExp(String(searchVal), "i");

    // Fetch matching references in parallel to perform matching in MatchResult
    const [matchingTeams, matchingUsers, matchingLeagues] = await Promise.all([
      Team.find({
        $or: [
          { teamName: { $regex: searchRegex } },
          { shortName: { $regex: searchRegex } },
        ],
      }).distinct("_id"),
      User.find({
        $or: [
          { userName: { $regex: searchRegex } },
          { firstName: { $regex: searchRegex } },
          { lastName: { $regex: searchRegex } },
          { email: { $regex: searchRegex } },
        ],
      }).distinct("_id"),
      League.find({
        $or: [
          { leagueName: { $regex: searchRegex } },
          { season: { $regex: searchRegex } },
        ],
      }).distinct("_id"),
    ]);

    filterQuery.$or = [
      { eventType: { $regex: searchRegex } },
      { "eventMeta.goalType": { $regex: searchRegex } },
      { "eventMeta.cardType": { $regex: searchRegex } },
      { "eventMeta.substitutionType": { $regex: searchRegex } },
      { team: { $in: matchingTeams } },
      { player: { $in: matchingUsers } },
      { addedBy: { $in: matchingUsers } },
      { "eventMeta.assist": { $in: matchingUsers } },
      { league: { $in: matchingLeagues } },
    ];
  }

  // 3. Sorting
  const sortField = (sort as string) || "-createdAt";

  // 4. Pagination
  const pageNumber = Number(page) || 1;
  const limitNumber = Number(limit) || 10;
  const skip = (pageNumber - 1) * limitNumber;

  // 5. Fields Selection
  const selectFields = (fields as string)?.split(",").join(" ") || "-__v";

  // 6. Execute Main Query & Pagination Total
  const [total, result] = await Promise.all([
    MatchResult.countDocuments(filterQuery),
    MatchResult.find(filterQuery)
      .sort(sortField)
      .skip(skip)
      .limit(limitNumber)
      .select(selectFields)
      .populate("league")
      .populate({
        path: "match",
        populate: [
          { path: "homeTeam", select: "teamName shortName teamLogo" },
          { path: "awayTeam", select: "teamName shortName teamLogo" }
        ]
      })
      .populate("team")
      .populate("player")
      .populate("addedBy")
      .populate("eventMeta.assist")
  ]);

  const totalPage = Math.ceil(total / limitNumber) || 1;
  const meta = {
    total,
    limit: limitNumber,
    page: pageNumber,
    totalPage,
  };

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
  if (payload.league === "" || !payload.league) {
    delete payload.league;
  }
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
    await emitMatchUpdate(updated.match.toString());
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
  await emitMatchUpdate(existing.match.toString());

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
      const goalCoin = pe?.goal?.coin ?? 0;
      const goalMV = pe?.goal?.marketValue ?? 0;
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
      const assistCoin = pe?.assist?.coin ?? 0;
      const assistMV = pe?.assist?.marketValue ?? 0;
      await User.findOneAndUpdate(
        { _id: eventMeta.assist },
        { $inc: { engCoine: assistCoin, marketValue: assistMV } },
      );
    }
  }

  // ================= YELLOW CARD =================
  if (eventType === "yellow_card") {
    inc.yellowCards = 1;

    // Force yellowCard.coin to be negative deduction
    const yellowCardCoin = -Math.abs(pe?.yellowCard?.coin ?? 0);
    const user = await User.findById(player);
    if (user) {
      const newCoins = Math.max(10000, (user.engCoine ?? 0) + yellowCardCoin);
      const rate = pe?.conversionRate ?? 100;
      const newMV = newCoins * rate;
      await User.findOneAndUpdate(
        { _id: player },
        { $set: { engCoine: newCoins, marketValue: newMV } },
      );
    }
  }

  // ================= RED CARD =================
  if (eventType === "red_card") {
    inc.redCards = 1;

    // Force redCard.coin to be negative deduction
    const redCardCoin = -Math.abs(pe?.redCard?.coin ?? 0);
    const user = await User.findById(player);
    if (user) {
      const newCoins = Math.max(10000, (user.engCoine ?? 0) + redCardCoin);
      const rate = pe?.conversionRate ?? 100;
      const newMV = newCoins * rate;
      await User.findOneAndUpdate(
        { _id: player },
        { $set: { engCoine: newCoins, marketValue: newMV } },
      );
    }
  }

  // ================= CLEAN SHEET =================
  if (eventType === "clean_sheet") {
    inc.cleanSheets = 1;

    const csCoin = pe?.cleanSheet?.coin ?? 0;
    const csMV = pe?.cleanSheet?.marketValue ?? 0;
    await User.findOneAndUpdate(
      { _id: player },
      { $inc: { engCoine: csCoin, marketValue: csMV } },
    );
  }

  // ================= PLAYER OF THE DAY =================
  if (eventType === "player_of_the_day") {
    inc.playerOfTheDay = 1;

    const potdCoin = pe?.playerOfTheDay?.coin ?? 0;
    const potdMV = pe?.playerOfTheDay?.marketValue ?? 0;
    await User.findOneAndUpdate(
      { _id: player },
      { $inc: { engCoine: potdCoin, marketValue: potdMV } },
    );
  }

  // ================= FOUL =================
  if (eventType === "foul") {
    inc.fouls = 1;

    const foulCoin = -Math.abs(pe?.foul?.coin ?? 0);
    const user = await User.findById(player);
    if (user) {
      const newCoins = Math.max(10000, (user.engCoine ?? 0) + foulCoin);
      const rate = pe?.conversionRate ?? 100;
      const newMV = newCoins * rate;
      await User.findOneAndUpdate(
        { _id: player },
        { $set: { engCoine: newCoins, marketValue: newMV } },
      );
    }
  }

  // ================= SIN BIN =================
  if (eventType === "sin_bin") {
    const sinBinCoin = -Math.abs(pe?.sinBin?.coin ?? 0);
    const user = await User.findById(player);
    if (user) {
      const newCoins = Math.max(10000, (user.engCoine ?? 0) + sinBinCoin);
      const rate = pe?.conversionRate ?? 100;
      const newMV = newCoins * rate;
      await User.findOneAndUpdate(
        { _id: player },
        { $set: { engCoine: newCoins, marketValue: newMV } },
      );
    }
  }

  // ================= DISRESPECT TO REFEREE =================
  if (eventType === "disrespect_to_referee") {
    const disrespectCoin = -Math.abs(pe?.disrespectToReferee?.coin ?? 0);
    const user = await User.findById(player);
    if (user) {
      const newCoins = Math.max(10000, (user.engCoine ?? 0) + disrespectCoin);
      const rate = pe?.conversionRate ?? 100;
      const newMV = newCoins * rate;
      await User.findOneAndUpdate(
        { _id: player },
        { $set: { engCoine: newCoins, marketValue: newMV } },
      );
    }
  }

  // ================= GROSS MISCONDUCT =================
  if (eventType === "gross_misconduct") {
    const misconductCoin = -Math.abs(pe?.grossMisconduct?.coin ?? 0);
    const user = await User.findById(player);
    if (user) {
      const newCoins = Math.max(10000, (user.engCoine ?? 0) + misconductCoin);
      const rate = pe?.conversionRate ?? 100;
      const newMV = newCoins * rate;
      await User.findOneAndUpdate(
        { _id: player },
        { $set: { engCoine: newCoins, marketValue: newMV } },
      );
    }
  }

  // ================= GOOD RATING =================
  if (eventType === "good_rating") {
    const coin = pe?.goodRating?.coin ?? 0;
    const mv = pe?.goodRating?.marketValue ?? 0;
    await User.findOneAndUpdate(
      { _id: player },
      { $inc: { engCoine: coin, marketValue: mv } },
    );
  }

  // ================= GREAT RATING =================
  if (eventType === "great_rating") {
    const coin = pe?.greatRating?.coin ?? 0;
    const mv = pe?.greatRating?.marketValue ?? 0;
    await User.findOneAndUpdate(
      { _id: player },
      { $inc: { engCoine: coin, marketValue: mv } },
    );
  }

  // ================= ELITE RATING =================
  if (eventType === "elite_rating") {
    const coin = pe?.eliteRating?.coin ?? 0;
    const mv = pe?.eliteRating?.marketValue ?? 0;
    await User.findOneAndUpdate(
      { _id: player },
      { $inc: { engCoine: coin, marketValue: mv } },
    );
  }

  // ================= PLAYING MATCH =================
  if (eventType === "playing_match") {
    const coin = pe?.playingMatch?.coin ?? 0;
    const mv = pe?.playingMatch?.marketValue ?? 0;
    await User.findOneAndUpdate(
      { _id: player },
      { $inc: { engCoine: coin, marketValue: mv } },
    );
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
      const goalCoin = pe?.goal?.coin ?? 0;
      const goalMV = pe?.goal?.marketValue ?? 0;
      const user = await User.findById(player);
      if (user) {
        const newCoins = Math.max(10000, (user.engCoine ?? 0) - goalCoin);
        const rate = pe?.conversionRate ?? 100;
        const newMV = newCoins * rate;
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
      const assistCoin = pe?.assist?.coin ?? 0;
      const assistMV = pe?.assist?.marketValue ?? 0;
      const assistUser = await User.findById(eventMeta.assist);
      if (assistUser) {
        const newCoins = Math.max(10000, (assistUser.engCoine ?? 0) - assistCoin);
        const rate = pe?.conversionRate ?? 100;
        const newMV = newCoins * rate;
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
    const yellowCardCoin = Math.abs(pe?.yellowCard?.coin ?? 0);
    const yellowCardMV = Math.abs(pe?.yellowCard?.marketValue ?? 0);
    await User.findOneAndUpdate(
      { _id: player },
      { $inc: { engCoine: yellowCardCoin, marketValue: yellowCardMV } },
    );
  }

  // ================= RED CARD =================
  if (eventType === "red_card") {
    inc.redCards = -1;

    // redCard.coin is negative — rollback by adding back absolute value
    const redCardCoin = Math.abs(pe?.redCard?.coin ?? 0);
    const redCardMV = Math.abs(pe?.redCard?.marketValue ?? 0);
    await User.findOneAndUpdate(
      { _id: player },
      { $inc: { engCoine: redCardCoin, marketValue: redCardMV } },
    );
  }

  // ================= CLEAN SHEET =================
  if (eventType === "clean_sheet") {
    inc.cleanSheets = -1;

    const csCoin = pe?.cleanSheet?.coin ?? 0;
    const csMV = pe?.cleanSheet?.marketValue ?? 0;
    const user = await User.findById(player);
    if (user) {
      const newCoins = Math.max(10000, (user.engCoine ?? 0) - csCoin);
      const rate = pe?.conversionRate ?? 100;
      const newMV = newCoins * rate;
      await User.findOneAndUpdate(
        { _id: player },
        { $set: { engCoine: newCoins, marketValue: newMV } },
      );
    }
  }

  // ================= PLAYER OF THE DAY =================
  if (eventType === "player_of_the_day") {
    inc.playerOfTheDay = -1;

    const potdCoin = pe?.playerOfTheDay?.coin ?? 0;
    const potdMV = pe?.playerOfTheDay?.marketValue ?? 0;
    const user = await User.findById(player);
    if (user) {
      const newCoins = Math.max(10000, (user.engCoine ?? 0) - potdCoin);
      const rate = pe?.conversionRate ?? 100;
      const newMV = newCoins * rate;
      await User.findOneAndUpdate(
        { _id: player },
        { $set: { engCoine: newCoins, marketValue: newMV } },
      );
    }
  }

  // ================= FOUL =================
  if (eventType === "foul") {
    inc.fouls = -1;

    const foulCoin = Math.abs(pe?.foul?.coin ?? 0);
    const foulMV = Math.abs(pe?.foul?.marketValue ?? 0);
    await User.findOneAndUpdate(
      { _id: player },
      { $inc: { engCoine: foulCoin, marketValue: foulMV } },
    );
  }

  // ================= SIN BIN =================
  if (eventType === "sin_bin") {
    const sinBinCoin = Math.abs(pe?.sinBin?.coin ?? 0);
    const sinBinMV = Math.abs(pe?.sinBin?.marketValue ?? 0);
    await User.findOneAndUpdate(
      { _id: player },
      { $inc: { engCoine: sinBinCoin, marketValue: sinBinMV } },
    );
  }

  // ================= DISRESPECT TO REFEREE =================
  if (eventType === "disrespect_to_referee") {
    const disrespectCoin = Math.abs(pe?.disrespectToReferee?.coin ?? 0);
    const disrespectMV = Math.abs(pe?.disrespectToReferee?.marketValue ?? 0);
    await User.findOneAndUpdate(
      { _id: player },
      { $inc: { engCoine: disrespectCoin, marketValue: disrespectMV } },
    );
  }

  // ================= GROSS MISCONDUCT =================
  if (eventType === "gross_misconduct") {
    const misconductCoin = Math.abs(pe?.grossMisconduct?.coin ?? 0);
    const misconductMV = Math.abs(pe?.grossMisconduct?.marketValue ?? 0);
    await User.findOneAndUpdate(
      { _id: player },
      { $inc: { engCoine: misconductCoin, marketValue: misconductMV } },
    );
  }

  // ================= GOOD RATING =================
  if (eventType === "good_rating") {
    const coin = pe?.goodRating?.coin ?? 0;
    const user = await User.findById(player);
    if (user) {
      const newCoins = Math.max(10000, (user.engCoine ?? 0) - coin);
      const rate = pe?.conversionRate ?? 100;
      const newMV = newCoins * rate;
      await User.findOneAndUpdate(
        { _id: player },
        { $set: { engCoine: newCoins, marketValue: newMV } },
      );
    }
  }

  // ================= GREAT RATING =================
  if (eventType === "great_rating") {
    const coin = pe?.greatRating?.coin ?? 0;
    const user = await User.findById(player);
    if (user) {
      const newCoins = Math.max(10000, (user.engCoine ?? 0) - coin);
      const rate = pe?.conversionRate ?? 100;
      const newMV = newCoins * rate;
      await User.findOneAndUpdate(
        { _id: player },
        { $set: { engCoine: newCoins, marketValue: newMV } },
      );
    }
  }

  // ================= ELITE RATING =================
  if (eventType === "elite_rating") {
    const coin = pe?.eliteRating?.coin ?? 0;
    const user = await User.findById(player);
    if (user) {
      const newCoins = Math.max(10000, (user.engCoine ?? 0) - coin);
      const rate = pe?.conversionRate ?? 100;
      const newMV = newCoins * rate;
      await User.findOneAndUpdate(
        { _id: player },
        { $set: { engCoine: newCoins, marketValue: newMV } },
      );
    }
  }

  // ================= PLAYING MATCH =================
  if (eventType === "playing_match") {
    const coin = pe?.playingMatch?.coin ?? 0;
    const user = await User.findById(player);
    if (user) {
      const newCoins = Math.max(10000, (user.engCoine ?? 0) - coin);
      const rate = pe?.conversionRate ?? 100;
      const newMV = newCoins * rate;
      await User.findOneAndUpdate(
        { _id: player },
        { $set: { engCoine: newCoins, marketValue: newMV } },
      );
    }
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

const rollbackAllResultsForMatch = async (matchId: string) => {
  const results = await MatchResult.find({ match: matchId });
  for (const r of results) {
    await rollbackPlayerStats(r);
  }
  await MatchResult.deleteMany({ match: matchId });
};

// ============================================================
export const MatchResultService = {
  createMatchResultToDB,
  getAllMatchResultsFromDB,
  getSingleMatchResultFromDB,
  updateMatchResultToDB,
  deleteMatchResultFromDB,
  getMatchWiseResultsFromDB,
  rollbackAllResultsForMatch,
};
