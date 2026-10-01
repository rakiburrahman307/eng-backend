import colors from "colors";
import { logger } from "../shared/logger";

// In-memory cache for fast deduplication with automatic TTL expiration
const dedupCache = new Map<string, number>();

// Cleanup expired keys every 60 seconds
setInterval(() => {
  const now = Date.now();
  for (const [key, expiresAt] of dedupCache.entries()) {
    if (now >= expiresAt) {
      dedupCache.delete(key);
    }
  }
}, 60000).unref(); // unref so it does not keep process alive unnecessarily

/**
 * Check if a notification is a duplicate within a given time-to-live window.
 * Returns true if this is a duplicate (should be dropped).
 * Returns false if it is new (registers it).
 */
export function isDuplicateNotification(key: string, ttlSeconds: number = 60): boolean {
  if (!key) return false;

  const now = Date.now();
  const existingExpiresAt = dedupCache.get(key);

  if (existingExpiresAt && now < existingExpiresAt) {
    logger.warn(
      colors.yellow(
        `[Notification Deduplication] Dropped duplicate notification trigger for key: "${key}" (cooldown active)`
      )
    );
    return true; // Is duplicate
  }

  // Record this key with expiration
  dedupCache.set(key, now + ttlSeconds * 1000);
  return false; // Not a duplicate
}

/**
 * Clear a key from deduplication cache (e.g. if queueing failed)
 */
export function clearDuplicateNotification(key: string): void {
  if (key) {
    dedupCache.delete(key);
  }
}

/**
 * Generate a deterministic deduplication key for a team notification
 */
export function generateTeamNotificationDedupKey(options: {
  teamId: string;
  type?: string;
  eventType?: string;
  referenceId?: string;
  minute?: string | number;
  playerId?: string;
  action?: string;
}): string {
  const parts = [
    "team_notif",
    options.teamId,
    options.type || "UPDATE",
    options.eventType || "GENERAL",
    options.referenceId || "NONE",
    options.playerId || "NONE",
    options.minute !== undefined && options.minute !== "" ? `m${options.minute}` : "NONE",
    options.action || "NONE",
  ];

  return parts.join("_").replace(/[:\s\r\n]+/g, "_");
}

/**
 * Generate a deterministic deduplication key for a single user notification
 */
export function generateUserNotificationDedupKey(options: {
  userId: string;
  type?: string;
  reference?: string;
  title?: string;
}): string {
  const parts = [
    "user_notif",
    options.userId,
    options.type || "GENERAL",
    options.reference || "NONE",
    options.title ? Buffer.from(options.title).toString("base64").substring(0, 16) : "NONE",
  ];

  return parts.join("_").replace(/[:\s\r\n]+/g, "_");
}
