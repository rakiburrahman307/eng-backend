import QueryBuilder from "../../../util/queryBuilder";
import { Match } from "./match.model";
import { LeagueTeam } from "../leagueTeam/leagueTeam.model";
import { User } from "../user/user.model";
import { Team } from "../team/team.model";
import { League } from "../league/league.model";
import { getRatingCoin } from "../../../util/getRatingCoin";
import mongoose from "mongoose";
import { ManagerTeam } from "../managerTeam/managerTeam.model";
import { NotificationQueueHelper } from "../../../helpers/bullMQ/bullHelper";
import { NOTIFICATION_TYPE } from "../notification/notification.interface";
import { VenueCategory } from "../venueCategory/venueCategory.model";
import ApiError from "../../../errors/ApiErrors";
import { StatusCodes } from "http-status-codes";
import { ClubEconomy } from "../coinAndBudget/clubEconomySchema.model";
import { MatchResult } from "../matchResult/matchResult.model";
import { PlayerStats } from "../playerStats/playerStats.model";
import { PlayerEconomy } from "../coinAndBudget/playerEconomySchema.model";

const formatMatchVenue = async (matchItem: any) => {
  if (!matchItem) return matchItem;
  const matchObj = matchItem.toObject ? matchItem.toObject() : { ...matchItem };

  const parts: string[] = [];
  let rawVenueName = matchObj.venueName || '';

  // 1. If rawVenueName is a valid ObjectId, try finding its VenueCategory document
  if (rawVenueName && mongoose.Types.ObjectId.isValid(rawVenueName)) {
    const venueCatDoc = await VenueCategory.findById(rawVenueName).populate('parentCategory', 'name');
    if (venueCatDoc) {
      if (venueCatDoc.parentCategory && (venueCatDoc.parentCategory as any).name) {
        parts.push((venueCatDoc.parentCategory as any).name);
      }
      parts.push(venueCatDoc.name);
      rawVenueName = ''; // reset since resolved
    }
  }

  // 2. Add raw text venueName if not ObjectId and not already included
  if (rawVenueName && !parts.includes(rawVenueName)) {
    parts.push(rawVenueName);
  }

  // 3. Add venueCategory name if present
  const catName = matchObj.venueCategory?.name || '';
  if (catName && !parts.includes(catName)) {
    parts.push(catName);
  }

  // 4. Add venueSubCategory name if present
  const subCatName = matchObj.venueSubCategory?.name || '';
  if (subCatName && !parts.includes(subCatName)) {
    parts.push(subCatName);
  }

  const finalVenueString = parts.length > 0 ? parts.join(', ') : (matchObj.venueName || '');

  let liveSeconds = matchObj.elapsedSeconds || 0;
  if (matchObj.timerStatus === 'running' && matchObj.timerStartedAt) {
    const diff = Math.floor((Date.now() - new Date(matchObj.timerStartedAt).getTime()) / 1000);
    if (diff > 0) liveSeconds += diff;
  }

  const durationMinutes = Number(matchObj.durationMinutes) || 90;

  return {
    ...matchObj,
    formation: matchObj.formation || null,
    venueName: finalVenueString,
    venue: finalVenueString,
    currentElapsedSeconds: liveSeconds,
    currentElapsedMinutes: Math.floor(liveSeconds / 60),
    totalDurationMinutes: durationMinutes,
  };
};

/* ---------------- RATING LOGIC ---------------- */

const VALID_FORMATIONS = ['5 v 5', '7 v 7', '8 v 8', '9 v 9'];

const createMatchToDB = async (payload: any) => {
  // single object হলে array বানাবে
  const matches = Array.isArray(payload) ? payload : [payload];

  const createdMatches: any[] = [];
  for (const matchData of matches) {
    const { league, homeTeam, awayTeam, matchDate, referee, venueName, formation } =
      matchData;

    // formation validation
    if (!formation) {
      throw new ApiError(StatusCodes.BAD_REQUEST, "Formation is required");
    }
    if (!VALID_FORMATIONS.includes(formation)) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        `Invalid formation. Must be one of: ${VALID_FORMATIONS.join(', ')}`
      );
    }

    // same team check
    if (homeTeam === awayTeam) {
      throw new Error("Same team cannot play match");
    }
    // league team validation
    const leagueTeams = await LeagueTeam.find({
      league,
    });
    const teamIds = leagueTeams.map((t) => t.team.toString());
    if (!teamIds.includes(homeTeam) || !teamIds.includes(awayTeam)) {
      throw new Error("Both teams must belong to this league");
    }
    // referee check
    if (referee) {
      const refereeExists = await User.findById(referee);
      if (!refereeExists) {
        throw new Error("Referee not found");
      }
    }

    // time range
    const matchTime = new Date(matchDate).getTime();
    const twoHours = 2 * 60 * 60 * 1000;
    const startWindow = new Date(matchTime - twoHours);

    const endWindow = new Date(matchTime + twoHours);

    // team conflict

    const teamConflict = await Match.findOne({
      matchDate: {
        $gte: startWindow,
        $lte: endWindow,
      },

      $or: [
        {
          homeTeam,
        },
        {
          awayTeam,
        },
      ],
    });

    if (teamConflict) {
      throw new Error("One of the teams already has a match in this time slot");
    }

    // referee conflict

    if (referee) {
      const refereeConflict = await Match.findOne({
        referee,

        matchDate: {
          $gte: startWindow,
          $lte: endWindow,
        },
      });

      if (refereeConflict) {
        throw new Error("Referee already assigned in this time slot");
      }
    }

    // venue conflict

    if (venueName) {
      const venueConflict = await Match.findOne({
        venueName,

        matchDate: {
          $gte: startWindow,
          $lte: endWindow,
        },
      });
      if (venueConflict) {
        throw new Error("Venue already booked in this time slot");
      }
    }
    // create
    const match = await Match.create(matchData);
    createdMatches.push(match);
  }
  return createdMatches;
};

const getAllMatchesFromDB = async (query: Record<string, any>) => {
  const { team, teamName, leagueName, startDate, endDate, ...otherQuery } = query;
  const initialFilter: Record<string, any> = {};

  if (leagueName) {
    const leagues = await League.find({
      leagueName: {
        $regex: leagueName,
        $options: "i",
      },
    }).select("_id");

    initialFilter.league = {
      $in: leagues.map((l) => l._id),
    };
  }

  const searchTeam = teamName || team;

  if (searchTeam) {
    if (mongoose.Types.ObjectId.isValid(searchTeam)) {
      initialFilter.$or = [
        { homeTeam: searchTeam },
        { awayTeam: searchTeam },
      ];
    } else {
      const teams = await Team.find({
        teamName: {
          $regex: searchTeam,
          $options: "i",
        },
      }).select("_id");

      const teamIds = teams.map((t) => t._id);
      initialFilter.$or = [
        { homeTeam: { $in: teamIds } },
        { awayTeam: { $in: teamIds } },
      ];
    }
  }

  if (startDate || endDate) {
    initialFilter.matchDate = {};
    if (startDate) initialFilter.matchDate.$gte = new Date(startDate);
    if (endDate) initialFilter.matchDate.$lte = new Date(endDate);
  }

  const matchQuery = new QueryBuilder(Match.find(initialFilter), otherQuery)
    .search(["venueName", "status", "notes"])
    .filter()
    .sort()
    .paginate()
    .fields();

  const matches = await matchQuery.modelQuery
    .populate("league")
    .populate("homeTeam")
    .populate("awayTeam")
    .populate("referee")
    .populate("winnerTeam")
    .populate("venueCategory", "name")
    .populate("venueSubCategory", "name");

  const meta = await matchQuery.getPaginationInfo();
  const formattedResult = await Promise.all(matches.map((m: any) => formatMatchVenue(m)));

  return {
    meta,
    result: formattedResult,
  };
};

const getMatchesByRefereeFromDB = async (
  refereeId: string,
  query: Record<string, any>,
) => {
  const matchQuery = new QueryBuilder(Match.find({ referee: refereeId }), query)
    .filter()
    .sort()
    .paginate()
    .fields();

  const matches = await matchQuery.modelQuery
    .populate("league")
    .populate("homeTeam")
    .populate("awayTeam")
    .populate("referee")
    .populate("winnerTeam")
    .populate("venueCategory", "name")
    .populate("venueSubCategory", "name");

  const meta = await matchQuery.getPaginationInfo();
  const formattedResult = await Promise.all(matches.map((m: any) => formatMatchVenue(m)));

  return {
    meta,
    result: formattedResult,
  };
};

// SINGLE
const getSingleMatchFromDB = async (id: string) => {
  const match = await Match.findById(id)
    .populate("league")
    .populate("homeTeam")
    .populate("awayTeam")
    .populate("referee")
    .populate("winnerTeam")
    .populate("venueCategory", "name")
    .populate("venueSubCategory", "name");

  if (!match) {
    throw new Error("Match not found");
  }

  return await formatMatchVenue(match);
};

// UPDATE
const updateMatchToDB = async (id: string, payload: any) => {
  const match = await Match.findById(id);

  if (!match) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Match not found");
  }

  if (
    payload.homeTeam &&
    payload.awayTeam &&
    payload.homeTeam === payload.awayTeam
  ) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Same team cannot play match");
  }

  return await Match.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  });
};

// DELETE
const deleteMatchFromDB = async (id: string) => {
  const match = await Match.findById(id);

  if (!match) {
    throw new Error("Match not found");
  }

  return await Match.findByIdAndDelete(id);
};

// TOGGLE STATUS
const toggleMatchStatusToDB = async (id: string) => {
  const match = await Match.findById(id);

  if (!match) {
    throw new Error("Match not found");
  }

  const oldStatus = match.status;

  if (match.status === "upcoming") {
    match.status = "live";

    // LIVE START → GIVE BOTH TEAM 1000 COIN
    await Team.updateMany(
      { _id: { $in: [match.homeTeam, match.awayTeam] } },
      { $inc: { coin: 1000 } },
    );
  } else if (match.status === "live") {
    match.status = "half_time";
  } else if (match.status === "half_time") {
    match.status = "finished";
  } else {
    match.status = "finished";
  }

  await match.save();

  // Send notifications if status has changed significantly
  if (match.status === "live" || match.status === "finished") {
    const homeTeam = await Team.findById(match.homeTeam);
    const awayTeam = await Team.findById(match.awayTeam);
    const matchName = `${homeTeam?.teamName || "Home Team"} vs ${awayTeam?.teamName || "Away Team"}`;
    
    // Find all users (players, managers, etc.) belonging to both teams
    const userDetails = await User.find({
      selectTeam: { $in: [match.homeTeam, match.awayTeam] }
    });

    if (userDetails.length > 0) {
      const title = match.status === "live" ? "Match is Live! ⚽" : "Match Finished! 🏁";
      const message = match.status === "live" 
        ? `The match ${matchName} has officially started and is now live!` 
        : `The match ${matchName} has finished. Check the final match results and ratings.`;

      const userIds = userDetails.map((u) => u._id.toString());

      await NotificationQueueHelper.sendBulkNotifications(
        userIds,
        title,
        message,
        NOTIFICATION_TYPE.MATCH_RESULT_PUBLISHED,
        undefined,
        match._id.toString(),
        "Match"
      );
    }
  }

  return match;
};

const addMatchReviewToDB = async (
  matchId: string,
  payload: {
    reviews: {
      team: string;
      rating: number;
    }[];
  },
) => {
  const match = await Match.findById(matchId);

  if (!match) throw new Error("Match not found");

  if (match.status !== "finished") {
    throw new Error("Only finished matches can be reviewed");
  }

  const reviewsWithCoin = payload.reviews.map((r) => ({
    team: r.team,
    rating: r.rating,
    coinImpact: getRatingCoin(r.rating),
  }));

  match.matchReview.push(...reviewsWithCoin);

  await match.save();

  for (const r of reviewsWithCoin) {
    await Team.findByIdAndUpdate(r.team, {
      $inc: { coin: r.coinImpact },
    });
  }

  return match;
};

const getUpcomingMatchesForManagerFromDB = async (
  managerId: string,
  query: Record<string, any>,
) => {
  const managerTeams = await ManagerTeam.find({
    manager: new mongoose.Types.ObjectId(managerId),
  });

  const teamIds = managerTeams.map((item) => item.team);

  const matchQuery = new QueryBuilder(
    Match.find({
      status: "upcoming",
      $or: [{ homeTeam: { $in: teamIds } }, { awayTeam: { $in: teamIds } }],
    }),
    query,
  )
    .filter()
    .sort()
    .paginate()
    .fields();

  const matches = await matchQuery.modelQuery
    .populate("league")
    .populate("homeTeam")
    .populate("awayTeam")
    .populate("referee")
    .populate("winnerTeam")
    .populate("venueCategory", "name")
    .populate("venueSubCategory", "name");

  const meta = await matchQuery.getPaginationInfo();
  const formattedResult = await Promise.all(matches.map((m: any) => formatMatchVenue(m)));

  return {
    meta,
    result: formattedResult,
  };
};

const updateMatchTimerInDB = async (
  matchId: string,
  action: 'START' | 'PAUSE' | 'RESUME' | 'FINISH',
  user?: any
) => {
  const match = await Match.findById(matchId);

  if (!match) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Match not found');
  }

  const now = new Date();
  let elapsed = match.elapsedSeconds || 0;

  // Accumulate segment elapsed time if timer was running
  if (match.timerStatus === 'running' && match.timerStartedAt) {
    const diffSeconds = Math.floor(
      (now.getTime() - new Date(match.timerStartedAt).getTime()) / 1000
    );
    if (diffSeconds > 0) {
      elapsed += diffSeconds;
    }
  }

  switch (action) {
    case 'START':
      match.timerStatus = 'running';
      match.timerStartedAt = now;
      match.elapsedSeconds = 0;
      match.status = 'live';
      break;

    case 'PAUSE':
      match.timerStatus = 'paused';
      match.timerStartedAt = null;
      match.elapsedSeconds = elapsed;
      match.status = 'live';
      break;

    case 'RESUME':
      match.timerStatus = 'running';
      match.timerStartedAt = now;
      match.elapsedSeconds = elapsed;
      match.status = 'live';
      break;

    case 'FINISH':
      match.timerStatus = 'finished';
      match.timerStartedAt = null;
      match.elapsedSeconds = elapsed;
      match.status = 'finished';
      break;

    default:
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Invalid timer action. Valid actions: START, PAUSE, RESUME, FINISH'
      );
  }

  await match.save();

  // Calculate live current elapsed for instant response & socket emit
  let liveSeconds = match.elapsedSeconds || 0;
  if (match.timerStatus === 'running' && match.timerStartedAt) {
    const diff = Math.floor((Date.now() - new Date(match.timerStartedAt).getTime()) / 1000);
    if (diff > 0) liveSeconds += diff;
  }

  // 📡 Socket broadcast
  if ((global as any).io) {
    (global as any).io.emit(`match_${matchId}_timer`, {
      matchId,
      action,
      timerStatus: match.timerStatus,
      elapsedSeconds: match.elapsedSeconds,
      currentElapsedSeconds: liveSeconds,
      currentElapsedMinutes: Math.floor(liveSeconds / 60),
      timerStartedAt: match.timerStartedAt,
      status: match.status,
      durationMinutes: match.durationMinutes,
    });
  }

  const formatted = await formatMatchVenue(match);
  return {
    ...formatted,
    currentElapsedSeconds: liveSeconds,
    currentElapsedMinutes: Math.floor(liveSeconds / 60),
  };
};

const modifyMatchScoreInDB = async (
  id: string,
  payload: {
    homeScore: number;
    awayScore: number;
    goalScorers?: Array<{
      team: string;
      player: string;
      assistPlayer?: string;
      minute?: number;
    }>;
  }
) => {
  const match = await Match.findById(id);

  if (!match) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Match not found");
  }

  if (payload.homeScore === undefined || payload.awayScore === undefined) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Both homeScore and awayScore must be provided");
  }

  const oldHomeScore = match.homeScore ?? 0;
  const oldAwayScore = match.awayScore ?? 0;
  const newHomeScore = Number(payload.homeScore);
  const newAwayScore = Number(payload.awayScore);

  let newWinnerTeam = null;
  if (newHomeScore > newAwayScore) {
    newWinnerTeam = match.homeTeam;
  } else if (newAwayScore > newHomeScore) {
    newWinnerTeam = match.awayTeam;
  }

  // If the match is already finished, adjust team coins & market value rewards
  if (match.status === 'finished') {
    const ce = await ClubEconomy.findOne();
    const drawCoin = ce?.drawMatch?.coin ?? 2000;
    const drawMV = ce?.drawMatch?.budgetValue ?? 20000;
    const winCoin = ce?.winMatch?.coin ?? 5000;
    const winMV = ce?.winMatch?.budgetValue ?? 50000;

    // Rollback old coin/MV allocations
    if (oldHomeScore === oldAwayScore) {
      await Team.findByIdAndUpdate(match.homeTeam, { $inc: { coin: -drawCoin, marketValue: -drawMV } });
      await Team.findByIdAndUpdate(match.awayTeam, { $inc: { coin: -drawCoin, marketValue: -drawMV } });
    } else {
      const oldWinner = oldHomeScore > oldAwayScore ? match.homeTeam : match.awayTeam;
      await Team.findByIdAndUpdate(oldWinner, { $inc: { coin: -winCoin, marketValue: -winMV } });
    }

    // Apply new coin/MV allocations
    if (newHomeScore === newAwayScore) {
      await Team.findByIdAndUpdate(match.homeTeam, { $inc: { coin: drawCoin, marketValue: drawMV } });
      await Team.findByIdAndUpdate(match.awayTeam, { $inc: { coin: drawCoin, marketValue: drawMV } });
    } else {
      await Team.findByIdAndUpdate(newWinnerTeam, { $inc: { coin: winCoin, marketValue: winMV } });
    }
  }

  // Handle assigned goal scorers for player stats, coins & notifications
  if (Array.isArray(payload.goalScorers) && payload.goalScorers.length > 0) {
    const pe = await PlayerEconomy.findOne();
    const goalCoin = pe?.goal?.coin ?? 2000;
    const goalMV = pe?.goal?.marketValue ?? 20000;
    const assistCoin = pe?.assist?.coin ?? 1000;
    const assistMV = pe?.assist?.marketValue ?? 10000;

    for (const scorer of payload.goalScorers) {
      if (scorer.player && scorer.team) {
        const min = Number(scorer.minute) || 1;

        // 1. Create MatchResult
        await MatchResult.create({
          match: match._id,
          league: match.league,
          team: scorer.team,
          player: scorer.player,
          eventType: 'goal',
          minute: min,
          addedBy: scorer.player,
          eventMeta: scorer.assistPlayer ? { assist: scorer.assistPlayer } : undefined,
        });

        // 2. Increment player stats
        await PlayerStats.findOneAndUpdate(
          { player: scorer.player },
          { $inc: { goals: 1 }, $set: { team: scorer.team } },
          { upsert: true, new: true }
        );

        // 3. Increment player coins & MV
        const scorerUser = await User.findById(scorer.player);
        if (scorerUser) {
          await User.findByIdAndUpdate(scorer.player, {
            $inc: { engCoine: goalCoin, marketValue: goalMV }
          });
        }

        // 4. Handle assist if provided
        if (scorer.assistPlayer) {
          await PlayerStats.findOneAndUpdate(
            { player: scorer.assistPlayer },
            { $inc: { assists: 1 } },
            { upsert: true, new: true }
          );
          const assistUser = await User.findById(scorer.assistPlayer);
          if (assistUser) {
            await User.findByIdAndUpdate(scorer.assistPlayer, {
              $inc: { engCoine: assistCoin, marketValue: assistMV }
            });
          }
        }

        // 5. Send notifications
        try {
          await NotificationQueueHelper.sendNotification(
            String(scorer.player),
            `Congratulations! You scored a goal at minute ${min}.`,
            "Goal Scored! ⚽",
            NOTIFICATION_TYPE.MATCH_RESULT_PUBLISHED
          );
          if (scorer.assistPlayer) {
            await NotificationQueueHelper.sendNotification(
              String(scorer.assistPlayer),
              `Well done! You assisted a goal at minute ${min}.`,
              "Assist Recorded! 👟⚽",
              NOTIFICATION_TYPE.MATCH_RESULT_PUBLISHED
            );
          }
        } catch (err) {
          console.error("Failed to send goal notification", err);
        }
      }
    }
  }

  match.homeScore = newHomeScore;
  match.awayScore = newAwayScore;
  match.winnerTeam = newWinnerTeam as any;

  await match.save();

  return await formatMatchVenue(match);
};

export const MatchService = {
  createMatchToDB,
  getAllMatchesFromDB,
  getSingleMatchFromDB,
  updateMatchToDB,
  deleteMatchFromDB,
  toggleMatchStatusToDB,
  getMatchesByRefereeFromDB,
  addMatchReviewToDB,
  getUpcomingMatchesForManagerFromDB,
  updateMatchTimerInDB,
  modifyMatchScoreInDB,
};
