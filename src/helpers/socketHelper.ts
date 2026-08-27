import colors from "colors";
import { Server, Socket } from "socket.io";
import { logger } from "../shared/logger";
import { socketService } from "./socket/service";
import { createAdapter } from "@socket.io/redis-adapter";
import Redis from "ioredis";
import config from "../config";

const socket = (io: Server) => {
  // Initialize Socket.io Redis Adapter for Cluster Mode scaling
  try {
    const pubClient = new Redis(config.redis.url || "redis://localhost:6379");
    const subClient = pubClient.duplicate();
    io.adapter(createAdapter(pubClient, subClient));
    logger.info(colors.green("✅ Socket.io Redis Adapter initialized successfully"));
  } catch (err) {
    logger.error(colors.red("❌ Failed to initialize Socket.io Redis Adapter:"), err);
  }

  // Initialize SocketService
  socketService.init(io);

  io.on("connection", (socket: Socket) => {
    logger.info(colors.blue("A User connected: " + socket.id));

    // ─────────────────────────────────────────────────────────────────────
    // JOIN USER-SPECIFIC ROOM
    // Client must emit: socket.emit("join", userId)
    // After joining, server will send notifications to: `user-${userId}`
    // ─────────────────────────────────────────────────────────────────────
    socket.on("join", (userId: any) => {
      if (userId) {
        let actualUserId = userId;
        if (typeof userId === "object" && userId !== null) {
          actualUserId = userId._id || userId.id || userId.userId;
        }
        if (actualUserId) {
          const strUserId = actualUserId.toString();
          socket.join(strUserId);
          socket.join(`user-${strUserId}`);
          logger.info(
            colors.green(`✅ User ${strUserId} joined room: ${strUserId} & user-${strUserId}`)
          );
        }
      }
    });

    // ─────────────────────────────────────────────────────────────────────
    // LEAVE USER-SPECIFIC ROOM
    // ─────────────────────────────────────────────────────────────────────
    socket.on("leave", (userId: any) => {
      if (userId) {
        let actualUserId = userId;
        if (typeof userId === "object" && userId !== null) {
          actualUserId = userId._id || userId.id || userId.userId;
        }
        if (actualUserId) {
          const strUserId = actualUserId.toString();
          socket.leave(strUserId);
          socket.leave(`user-${strUserId}`);
          logger.info(
            colors.yellow(`❌ User ${strUserId} left room: ${strUserId} & user-${strUserId}`)
          );
        }
      }
    });

    // ─────────────────────────────────────────────────────────────────────
    // JOIN/LEAVE MATCH DETAIL ROOMS (OPTIMIZATION)
    // ─────────────────────────────────────────────────────────────────────
    socket.on("join_match", (matchId: any) => {
      if (matchId) {
        let actualMatchId = matchId;
        if (typeof matchId === "object" && matchId !== null) {
          actualMatchId = matchId._id || matchId.id || matchId.matchId;
        }
        if (actualMatchId) {
          const strMatchId = actualMatchId.toString();
          socket.join(`match_${strMatchId}`);
          logger.info(
            colors.green(`✅ Socket ${socket.id} joined room: match_${strMatchId}`)
          );
        }
      }
    });

    socket.on("leave_match", (matchId: any) => {
      if (matchId) {
        let actualMatchId = matchId;
        if (typeof matchId === "object" && matchId !== null) {
          actualMatchId = matchId._id || matchId.id || matchId.matchId;
        }
        if (actualMatchId) {
          const strMatchId = actualMatchId.toString();
          socket.leave(`match_${strMatchId}`);
          logger.info(
            colors.yellow(`❌ Socket ${socket.id} left room: match_${strMatchId}`)
          );
        }
      }
    });

    // ─────────────────────────────────────────────────────────────────────
    // DISCONNECT
    // ─────────────────────────────────────────────────────────────────────
    socket.on("disconnect", () => {
      logger.info(colors.red("A user disconnected: " + socket.id));
    });
  });
};

export const socketHelper = { socket };