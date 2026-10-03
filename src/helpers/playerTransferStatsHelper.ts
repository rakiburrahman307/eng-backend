import mongoose, { Types } from "mongoose";
import { LeagueTeam } from "../app/modules/leagueTeam/leagueTeam.model";
import { PlayerStats } from "../app/modules/playerStats/playerStats.model";
import { MatchResult } from "../app/modules/matchResult/matchResult.model";
import { getPlayerStatsSummary } from "./playerStatsHelper";
import { Transfer } from "../app/modules/transfer/transfer.model";

/**
 * Carries forward all historical statistics, match results, and PlayerStats records
 * for a player when they transfer or are reassigned to a new team.
 */
export const carryForwardPlayerStats = async (
  playerId: string | Types.ObjectId,
  toTeamId: string | Types.ObjectId,
  targetLeagueId?: string | Types.ObjectId | null,
): Promise<void> => {
  try {
    const playerObjId =
      typeof playerId === "string" ? new mongoose.Types.ObjectId(playerId) : playerId;
    const toTeamObjId =
      typeof toTeamId === "string" ? new mongoose.Types.ObjectId(toTeamId) : toTeamId;

    if (!playerObjId || !toTeamObjId) return;

    // 1. Determine target league for the new team if not explicitly passed
    let finalLeagueId: Types.ObjectId | null = targetLeagueId
      ? typeof targetLeagueId === "string"
        ? new mongoose.Types.ObjectId(targetLeagueId)
        : targetLeagueId
      : null;

    if (!finalLeagueId) {
      const leagueTeamLink = await LeagueTeam.findOne({ team: toTeamObjId })
        .sort({ createdAt: -1 })
        .lean();
      if (leagueTeamLink?.league) {
        finalLeagueId = leagueTeamLink.league as Types.ObjectId;
      }
    }

    const updateSet: Record<string, any> = {
      team: toTeamObjId,
    };
    if (finalLeagueId) {
      updateSet.league = finalLeagueId;
    }

    // 2. Update all existing PlayerStats documents for this player
    const updateResult = await PlayerStats.updateMany(
      { player: playerObjId },
      { $set: updateSet },
    );

    // If no PlayerStats record existed yet, create/upsert one with cumulative career stats
    if (updateResult.matchedCount === 0) {
      const summary = await getPlayerStatsSummary(playerObjId);
      await PlayerStats.create({
        player: playerObjId,
        team: toTeamObjId,
        league: finalLeagueId || undefined,
        goals: summary.goals,
        assists: summary.assists,
        cleanSheets: summary.cleanSheets,
        playerOfTheDay: summary.playerOfTheDay,
        yellowCards: summary.yellowCards,
        redCards: summary.redCards,
        matchesPlayed: summary.matchesPlayed,
        totalMatches: summary.totalMatches,
      });
    }

    // 3. Update MatchResult records so individual goals, assists, clean sheets, and cards carry forward
    await MatchResult.updateMany(
      { player: playerObjId },
      { $set: updateSet },
    );

    // Also update any match event records where this player is the assist contributor
    if (finalLeagueId) {
      await MatchResult.updateMany(
        { "eventMeta.assist": playerObjId },
        { $set: { league: finalLeagueId } },
      );
    }
  } catch (error) {
    console.error(`Failed to carry forward stats for player ${playerId}:`, error);
  }
};

/**
 * Retroactively syncs stats for all previously approved transfers in the system.
 */
export const syncAllApprovedTransfersStats = async (): Promise<{ synced: number }> => {
  try {
    const approvedTransfers = await Transfer.find({ status: "APPROVED" }).lean();
    let count = 0;

    for (const t of approvedTransfers) {
      if (t.player && t.toTeam) {
        await carryForwardPlayerStats(t.player, t.toTeam);
        count++;
      }
    }

    return { synced: count };
  } catch (error) {
    console.error("Failed to sync approved transfers stats:", error);
    return { synced: 0 };
  }
};
