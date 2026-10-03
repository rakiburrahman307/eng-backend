import colors from 'colors';
import { Match } from '../app/modules/match/match.model';
import { TeamSubscription } from '../app/modules/teamSubscription/teamSubscription.model';
import { ManagerTeam } from '../app/modules/managerTeam/managerTeam.model';
import { User } from '../app/modules/user/user.model';
import { NotificationHelper } from '../app/builder/PushNotifications';
import { NOTIFICATION_TYPE } from '../app/modules/notification/notification.interface';
import { logger } from '../shared/logger';

export interface IMatchReminderResult {
  processedMatches: number;
  totalRecipients: number;
}

/**
 * Automatically checks for upcoming matches scheduled approximately 1 day (within 24-28 hours)
 * in advance and dispatches push & in-app notifications to all relevant stakeholders:
 * - Both teams' players and their parents
 * - Both teams' registered managers
 * - Both teams' active bell subscribers
 * - The assigned match referee
 */
export async function checkAndSendUpcomingMatchReminders(): Promise<IMatchReminderResult> {
  const now = new Date();
  // 28-hour forward window captures all matches scheduled for tomorrow
  const maxFuture = new Date(now.getTime() + 28 * 60 * 60 * 1000);

  let processedMatches = 0;
  let totalRecipients = 0;

  try {
    const upcomingMatches = await Match.find({
      status: { $in: ['upcoming', 'scheduled'] },
      oneDayReminderSent: { $ne: true },
      $or: [
        { matchDate: { $gte: now, $lte: maxFuture } },
        { scheduledAt: { $gte: now, $lte: maxFuture } },
      ],
    })
      .populate('homeTeam', 'teamName logo')
      .populate('awayTeam', 'teamName logo')
      .populate('league', 'leagueName')
      .lean();

    if (!upcomingMatches || upcomingMatches.length === 0) {
      return { processedMatches: 0, totalRecipients: 0 };
    }

    logger.info(
      colors.cyan(
        `[Match Reminders] Found ${upcomingMatches.length} upcoming matches within 24-28h window to notify.`
      )
    );

    for (const match of (upcomingMatches as any[])) {
      // 1. Atomically claim this match to prevent duplicate processing across concurrent workers
      const claimed = await Match.findOneAndUpdate(
        { _id: match._id, oneDayReminderSent: { $ne: true } },
        { $set: { oneDayReminderSent: true, oneDayReminderSentAt: new Date() } }
      );

      if (!claimed) {
        continue;
      }

      const hName = (match.homeTeam as any)?.teamName || 'Home Team';
      const aName = (match.awayTeam as any)?.teamName || 'Away Team';
      const venue = match.venueName || '';

      const matchTime = new Date(match.scheduledAt || match.matchDate);
      let timeStr = '';
      let dateStr = '';
      try {
        timeStr = matchTime.toLocaleTimeString('en-GB', {
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'Europe/London',
        });
        dateStr = matchTime.toLocaleDateString('en-GB', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          timeZone: 'Europe/London',
        });
      } catch {
        timeStr = matchTime.toISOString().slice(11, 16);
        dateStr = matchTime.toISOString().slice(0, 10);
      }

      const title = `Match Reminder: ${hName} vs ${aName}`;
      const body = `Upcoming match: ${hName} vs ${aName} kicks off tomorrow (${dateStr}) at ${timeStr}${
        venue ? ` at ${venue}` : ''
      }. Don't miss it!`;

      // 2. Resolve all recipients across both teams
      const teamIds = [
        (match.homeTeam as any)?._id || match.homeTeam,
        (match.awayTeam as any)?._id || match.awayTeam,
      ].filter(Boolean);

      const recipientSet = new Set<string>();

      if (teamIds.length > 0) {
        const [teamUsers, subscribers, managerTeams, directManagers] = await Promise.all([
          // A. Players and users with selectTeam
          User.find({
            selectTeam: { $in: teamIds },
            verified: true,
          })
            .select('_id parentId role')
            .lean(),

          // B. Team subscribers with active notifications
          TeamSubscription.find({
            team: { $in: teamIds },
            isBellActive: true,
          })
            .select('user')
            .lean(),

          // C. Managers assigned through ManagerTeam
          ManagerTeam.find({
            team: { $in: teamIds },
          })
            .select('manager')
            .lean(),

          // D. Direct team managers
          User.find({
            role: 'MANAGER',
            selectTeam: { $in: teamIds },
            verified: true,
          })
            .select('_id')
            .lean(),
        ]);

        // Add team users + their parents if child profile
        (teamUsers || []).forEach((u: any) => {
          if (u._id) recipientSet.add(u._id.toString());
          if (u.parentId) recipientSet.add(u.parentId.toString());
        });

        // Add subscribers
        (subscribers || []).forEach((s: any) => {
          const id = s.user?.toString();
          if (id) recipientSet.add(id);
        });

        // Add manager teams
        (managerTeams || []).forEach((m: any) => {
          const id = m.manager?.toString();
          if (id) recipientSet.add(id);
        });

        // Add direct managers
        (directManagers || []).forEach((u: any) => {
          const id = u._id?.toString();
          if (id) recipientSet.add(id);
        });
      }

      // Add referee if assigned
      if (match.referee) {
        recipientSet.add(match.referee.toString());
      }

      const recipientIds = Array.from(recipientSet);

      if (recipientIds.length > 0) {
        const payload = {
          title,
          body,
          type: NOTIFICATION_TYPE.MATCH_REMINDER,
          reference: match._id.toString(),
          referenceModel: 'Match',
          data: {
            matchId: match._id.toString(),
            homeTeamId: String((match.homeTeam as any)?._id || match.homeTeam || ''),
            awayTeamId: String((match.awayTeam as any)?._id || match.awayTeam || ''),
            screen: 'MATCH_DETAILS',
          },
        };

        const CHUNK_SIZE = 500;
        for (let i = 0; i < recipientIds.length; i += CHUNK_SIZE) {
          const batch = recipientIds.slice(i, i + CHUNK_SIZE);
          await NotificationHelper.sendToBatch(batch, payload);
        }

        logger.info(
          colors.green(
            `[Match Reminders] Dispatched reminder for match "${hName} vs ${aName}" to ${recipientIds.length} recipients.`
          )
        );
      } else {
        logger.info(
          colors.yellow(
            `[Match Reminders] Match "${hName} vs ${aName}" has no registered recipients. Marked as notified.`
          )
        );
      }

      processedMatches++;
      totalRecipients += recipientIds.length;
    }

    return { processedMatches, totalRecipients };
  } catch (error) {
    logger.error(colors.red('❌ Error in checkAndSendUpcomingMatchReminders:'), error);
    return { processedMatches, totalRecipients };
  }
}
