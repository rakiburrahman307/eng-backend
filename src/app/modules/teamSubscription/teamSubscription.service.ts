import mongoose from "mongoose";
import { StatusCodes } from "http-status-codes";
import ApiError from "../../../errors/ApiErrors";
import { Team } from "../team/team.model";
import { User } from "../user/user.model";
import { TeamSubscription } from "./teamSubscription.model";
import { NotificationQueueHelper } from "../../../helpers/bullMQ/bullHelper";
import { NotificationHelper } from "../../builder/PushNotifications";
import { logger, errorLogger } from "../../../shared/logger";
import colors from "colors";

// ============================================================================
// 1. TOGGLE TEAM SUBSCRIPTION (BELL ICON ON / OFF)
// ============================================================================
const toggleTeamSubscription = async (
  userId: string,
  teamId: string,
  explicitState?: boolean
) => {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid user ID");
  }
  if (!mongoose.Types.ObjectId.isValid(teamId)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid team ID");
  }

  const team = await Team.findById(teamId)
    .select("_id teamName shortName teamLogo")
    .lean();
  if (!team) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Team not found");
  }

  const existingSubscription = await TeamSubscription.findOne({
    user: userId,
    team: teamId,
  });

  let isSubscribed = true;

  if (existingSubscription) {
    if (typeof explicitState === "boolean") {
      isSubscribed = explicitState;
    } else {
      isSubscribed = !existingSubscription.isBellActive;
    }

    existingSubscription.isBellActive = isSubscribed;
    if (isSubscribed) {
      existingSubscription.subscribedAt = new Date();
      existingSubscription.unsubscribedAt = null;
    } else {
      existingSubscription.unsubscribedAt = new Date();
    }
    await existingSubscription.save();
  } else {
    isSubscribed = typeof explicitState === "boolean" ? explicitState : true;
    await TeamSubscription.create({
      user: userId,
      team: teamId,
      isBellActive: isSubscribed,
      subscribedAt: new Date(),
    });
  }

  const subscriberCount = await TeamSubscription.countDocuments({
    team: teamId,
    isBellActive: true,
  });

  return {
    isSubscribed,
    teamId,
    team,
    subscriberCount,
    message: isSubscribed
      ? `You have subscribed to ${team.teamName || "team"} updates.`
      : `You have unsubscribed from ${team.teamName || "team"} updates.`,
  };
};

// ============================================================================
// 2. CHECK SUBSCRIPTION STATUS FOR A TEAM
// ============================================================================
const getSubscriptionStatus = async (userId: string, teamId: string) => {
  if (!mongoose.Types.ObjectId.isValid(teamId)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid team ID");
  }

  const [subscription, team, subscriberCount] = await Promise.all([
    userId && mongoose.Types.ObjectId.isValid(userId)
      ? TeamSubscription.findOne({ user: userId, team: teamId }).lean()
      : null,
    Team.findById(teamId).select("_id teamName shortName teamLogo").lean(),
    TeamSubscription.countDocuments({ team: teamId, isBellActive: true }),
  ]);

  if (!team) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Team not found");
  }

  return {
    teamId,
    team,
    isSubscribed: !!subscription?.isBellActive,
    subscribedAt: subscription?.subscribedAt || null,
    subscriberCount,
  };
};

// ============================================================================
// 3. GET ALL TEAMS SUBSCRIBED BY USER
// ============================================================================
const getMySubscribedTeams = async (userId: string) => {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid user ID");
  }

  const subscriptions = await TeamSubscription.find({
    user: userId,
    isBellActive: true,
  })
    .populate({
      path: "team",
      select: "_id teamName shortName teamLogo venue coachName",
    })
    .sort({ updatedAt: -1 })
    .lean();

  const validTeams = subscriptions
    .filter((sub: any) => sub.team)
    .map((sub: any) => ({
      subscriptionId: sub._id,
      subscribedAt: sub.subscribedAt,
      team: sub.team,
    }));

  return validTeams;
};

// ============================================================================
// 4. GET TOTAL ACTIVE SUBSCRIBERS COUNT FOR A TEAM
// ============================================================================
const getTeamSubscribersCount = async (teamId: string) => {
  if (!mongoose.Types.ObjectId.isValid(teamId)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid team ID");
  }

  const count = await TeamSubscription.countDocuments({
    team: teamId,
    isBellActive: true,
  });

  return {
    teamId,
    subscriberCount: count,
  };
};

// ============================================================================
// 5. NOTIFY ALL SUBSCRIBERS OF A TEAM (BULLMQ QUEUE WITH DIRECT FALLBACK)
// ============================================================================
const notifyTeamSubscribers = async (
  teamId: string | mongoose.Types.ObjectId,
  payload: {
    title: string;
    message: string;
    eventType?: string;
    referenceId?: string;
    referenceModel?: string;
    screen?: string;
    metadata?: Record<string, any>;
  }
) => {
  const teamIdStr = teamId.toString();

  try {
    // Primary path: Queue job to BullMQ for high-scale asynchronous processing
    await NotificationQueueHelper.notifyTeamSubscribers(
      teamIdStr,
      payload.title,
      payload.message,
      payload.eventType || "TEAM_UPDATE",
      payload.referenceId,
      payload.referenceModel || "Team",
      {
        screen: payload.screen || "TEAM_DETAILS",
        ...(payload.metadata || {}),
      }
    );
    logger.info(
      colors.green(
        `[BullMQ] Enqueued team subscriber notification for team ${teamIdStr}: "${payload.title}"`
      )
    );
  } catch (queueErr) {
    // Resilient fallback: If Redis/BullMQ is down or temporarily unreachable,
    // dispatch in background promise directly to prevent dropped notifications
    errorLogger.error(
      colors.yellow(
        `[BullMQ Fallback] Queue unavailable for team ${teamIdStr}, falling back to direct batch dispatch:`
      ),
      queueErr
    );

    setImmediate(async () => {
      try {
        const subs = await TeamSubscription.find({
          team: teamIdStr,
          isBellActive: true,
        })
          .select("user")
          .lean();

        const userIds = Array.from(
          new Set(subs.map((s: any) => s.user.toString()).filter(Boolean))
        ).filter(
          (id) => !payload.metadata?.playerId || id !== payload.metadata.playerId.toString()
        );
        if (userIds.length > 0) {
          const CHUNK_SIZE = 500;
          for (let i = 0; i < userIds.length; i += CHUNK_SIZE) {
            const chunk = userIds.slice(i, i + CHUNK_SIZE);
            await NotificationHelper.sendToBatch(chunk, {
              title: payload.title,
              body: payload.message,
              type: payload.eventType || "TEAM_UPDATE",
              reference: payload.referenceId,
              referenceModel: payload.referenceModel || "Team",
              data: {
                teamId: teamIdStr,
                screen: payload.screen || "TEAM_DETAILS",
                ...(payload.metadata || {}),
              },
            });
          }
          logger.info(
            colors.cyan(
              `[Fallback Direct] Dispatched notification to ${userIds.length} subscribers of team ${teamIdStr}`
            )
          );
        }
      } catch (directErr) {
        errorLogger.error(
          colors.red(`[Fallback Direct Error] Failed for team ${teamIdStr}:`),
          directErr
        );
      }
    });
  }
};

// ============================================================================
// 6. HELPER: NOTIFY TEAM SUBSCRIBERS WHEN A PLAYER DOES AN ACTION
// ============================================================================
const notifyTeamPlayerAction = async (
  playerId: string | mongoose.Types.ObjectId,
  actionDetails: {
    title: string;
    message: string;
    eventType?: string;
    teamId?: string | mongoose.Types.ObjectId;
    referenceId?: string;
    referenceModel?: string;
    metadata?: Record<string, any>;
  }
) => {
  let targetTeamId = actionDetails.teamId?.toString();

  // If teamId not explicitly passed, lookup the player's primary team
  if (!targetTeamId && playerId) {
    const player = await User.findById(playerId).select("selectTeam").lean();
    if (player?.selectTeam) {
      targetTeamId = player.selectTeam.toString();
    }
  }

  if (!targetTeamId) {
    return; // Player has no linked team, skip team subscriber notification
  }

  await notifyTeamSubscribers(targetTeamId, {
    title: actionDetails.title,
    message: actionDetails.message,
    eventType: actionDetails.eventType || "PLAYER_ACTION",
    referenceId: actionDetails.referenceId || playerId.toString(),
    referenceModel: actionDetails.referenceModel || "User",
    screen: "TEAM_DETAILS",
    metadata: {
      playerId: playerId.toString(),
      ...(actionDetails.metadata || {}),
    },
  });
};

export const TeamSubscriptionService = {
  toggleTeamSubscription,
  getSubscriptionStatus,
  getMySubscribedTeams,
  getTeamSubscribersCount,
  notifyTeamSubscribers,
  notifyTeamPlayerAction,
};
