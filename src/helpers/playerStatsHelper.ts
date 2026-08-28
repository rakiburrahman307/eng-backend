import mongoose, { Types } from "mongoose";
import { MatchResult } from "../app/modules/matchResult/matchResult.model";
import { PlayerStats } from "../app/modules/playerStats/playerStats.model";
import { MatchEvaluation } from "../app/modules/refereeRating/refereeRating.model";

export interface IPlayerStatsDetails {
  goals: number;
  assists: number;
  cleanSheets: number;
  playerOfTheDay: number;
  yellowCards: number;
  redCards: number;
}

/**
 * Calculates complete player statistics including:
 * - Goals
 * - Assists
 * - Clean Sheets
 * - Player Of The Day (Man of the Match)
 * - Yellow Cards
 * - Red Cards
 */
export const getPlayerStatsSummary = async (
  playerId: string | Types.ObjectId
): Promise<IPlayerStatsDetails> => {
  const playerObjectId =
    typeof playerId === "string" ? new mongoose.Types.ObjectId(playerId) : playerId;

  // 1. Aggregate from MatchResult (direct events + assists in eventMeta)
  const [matchResults, evaluationsCount, manualStats] = await Promise.all([
    MatchResult.aggregate([
      {
        $match: {
          $or: [
            { player: playerObjectId },
            { "eventMeta.assist": playerObjectId },
          ],
        },
      },
      {
        $group: {
          _id: null,
          goals: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$player", playerObjectId] },
                    { $eq: ["$eventType", "goal"] },
                    { $ne: ["$eventMeta.goalType", "own_goal"] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          assistsDirect: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$player", playerObjectId] },
                    { $eq: ["$eventType", "assist"] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          assistsMeta: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$eventMeta.assist", playerObjectId] },
                    { $eq: ["$eventType", "goal"] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          yellowCards: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$player", playerObjectId] },
                    { $eq: ["$eventType", "yellow_card"] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          redCards: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$player", playerObjectId] },
                    { $eq: ["$eventType", "red_card"] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          cleanSheets: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$player", playerObjectId] },
                    { $eq: ["$eventType", "clean_sheet"] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          playerOfTheDayEvents: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$player", playerObjectId] },
                    {
                      $in: [
                        "$eventType",
                        ["player_of_the_day", "man_of_the_match"],
                      ],
                    },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ]),
    MatchEvaluation.countDocuments({
      manOfTheMatch: playerObjectId,
    }),
    PlayerStats.find({ player: playerObjectId }).lean(),
  ]);

  const mr = matchResults[0] || {};
  const goalsMR = Number(mr.goals) || 0;
  const assistsMR = (Number(mr.assistsDirect) || 0) + (Number(mr.assistsMeta) || 0);
  const yellowMR = Number(mr.yellowCards) || 0;
  const redMR = Number(mr.redCards) || 0;
  const cleanMR = Number(mr.cleanSheets) || 0;
  const potdMR = (Number(mr.playerOfTheDayEvents) || 0) + (evaluationsCount || 0);

  let psGoals = 0;
  let psAssists = 0;
  let psYellow = 0;
  let psRed = 0;
  let psClean = 0;
  let psPOTD = 0;

  if (Array.isArray(manualStats)) {
    for (const stats of manualStats) {
      psGoals += Number(stats.goals) || 0;
      psAssists += Number(stats.assists) || 0;
      psYellow += Number(stats.yellowCards) || 0;
      psRed += Number(stats.redCards) || 0;
      psClean += Number(stats.cleanSheets) || 0;
      psPOTD += Number(stats.playerOfTheDay) || 0;
    }
  }

  return {
    goals: Math.max(goalsMR, psGoals),
    assists: Math.max(assistsMR, psAssists),
    cleanSheets: Math.max(cleanMR, psClean),
    playerOfTheDay: Math.max(potdMR, psPOTD),
    yellowCards: Math.max(yellowMR, psYellow),
    redCards: Math.max(redMR, psRed),
  };
};

/**
 * Calculates player statistics in batch for multiple players.
 */
export const getBatchPlayerStatsSummary = async (
  playerIds: (string | Types.ObjectId)[]
): Promise<Map<string, IPlayerStatsDetails>> => {
  const result = new Map<string, IPlayerStatsDetails>();

  if (!playerIds || playerIds.length === 0) {
    return result;
  }

  const objectIds = playerIds
    .filter((id) => Types.ObjectId.isValid(id as any))
    .map((id) => new mongoose.Types.ObjectId(id as any));

  if (objectIds.length === 0) {
    return result;
  }

  // Initialize all requested player IDs with 0
  objectIds.forEach((id) => {
    result.set(id.toString(), {
      goals: 0,
      assists: 0,
      cleanSheets: 0,
      playerOfTheDay: 0,
      yellowCards: 0,
      redCards: 0,
    });
  });

  const [matchResults, evalCounts, manualStats] = await Promise.all([
    MatchResult.aggregate([
      {
        $match: {
          $or: [
            { player: { $in: objectIds } },
            { "eventMeta.assist": { $in: objectIds } },
          ],
        },
      },
      {
        $facet: {
          directEvents: [
            {
              $match: { player: { $in: objectIds } },
            },
            {
              $group: {
                _id: { player: "$player", eventType: "$eventType" },
                count: { $sum: 1 },
              },
            },
          ],
          assistsFromMeta: [
            {
              $match: {
                "eventMeta.assist": { $in: objectIds },
                eventType: "goal",
              },
            },
            {
              $group: {
                _id: "$eventMeta.assist",
                count: { $sum: 1 },
              },
            },
          ],
        },
      },
    ]),
    MatchEvaluation.aggregate([
      {
        $match: { manOfTheMatch: { $in: objectIds } },
      },
      {
        $group: {
          _id: "$manOfTheMatch",
          count: { $sum: 1 },
        },
      },
    ]),
    PlayerStats.find({ player: { $in: objectIds } }).lean(),
  ]);

  const facet = matchResults[0] || { directEvents: [], assistsFromMeta: [] };

  // Map direct events
  facet.directEvents?.forEach((item: any) => {
    const pId = item._id?.player?.toString();
    const eventType = item._id?.eventType;
    if (!pId || !result.has(pId)) return;

    const stats = result.get(pId)!;
    if (eventType === "goal") stats.goals += item.count;
    if (eventType === "assist") stats.assists += item.count;
    if (eventType === "yellow_card") stats.yellowCards += item.count;
    if (eventType === "red_card") stats.redCards += item.count;
    if (eventType === "clean_sheet") stats.cleanSheets += item.count;
    if (eventType === "player_of_the_day" || eventType === "man_of_the_match") {
      stats.playerOfTheDay += item.count;
    }
  });

  // Map assist in eventMeta
  facet.assistsFromMeta?.forEach((item: any) => {
    const pId = item._id?.toString();
    if (!pId || !result.has(pId)) return;
    result.get(pId)!.assists += item.count;
  });

  // Map match evaluations
  evalCounts?.forEach((item: any) => {
    const pId = item._id?.toString();
    if (!pId || !result.has(pId)) return;
    result.get(pId)!.playerOfTheDay += item.count;
  });

  // Sum manual/upserted stats from PlayerStats for each player
  const summedManualMap = new Map<string, any>();
  manualStats?.forEach((item: any) => {
    const pId = item.player?.toString();
    if (!pId) return;

    const existing = summedManualMap.get(pId) || {
      goals: 0,
      assists: 0,
      yellowCards: 0,
      redCards: 0,
      cleanSheets: 0,
      playerOfTheDay: 0,
    };

    summedManualMap.set(pId, {
      goals: existing.goals + (Number(item.goals) || 0),
      assists: existing.assists + (Number(item.assists) || 0),
      yellowCards: existing.yellowCards + (Number(item.yellowCards) || 0),
      redCards: existing.redCards + (Number(item.redCards) || 0),
      cleanSheets: existing.cleanSheets + (Number(item.cleanSheets) || 0),
      playerOfTheDay: existing.playerOfTheDay + (Number(item.playerOfTheDay) || 0),
    });
  });

  // Merge summed manual stats with dynamic match results
  summedManualMap.forEach((item: any, pId: string) => {
    if (!result.has(pId)) return;

    const stats = result.get(pId)!;
    stats.goals = Math.max(stats.goals, item.goals);
    stats.assists = Math.max(stats.assists, item.assists);
    stats.yellowCards = Math.max(stats.yellowCards, item.yellowCards);
    stats.redCards = Math.max(stats.redCards, item.redCards);
    stats.cleanSheets = Math.max(stats.cleanSheets, item.cleanSheets);
    stats.playerOfTheDay = Math.max(stats.playerOfTheDay, item.playerOfTheDay);
  });

  return result;
};
