import colors from "colors";
import { Server, Socket } from "socket.io";
import { logger } from "../shared/logger";

const socket = (io: Server) => {
  io.on("connection", (socket: Socket) => {
    logger.info(colors.blue("A User connected: " + socket.id));

    // ─────────────────────────────────────────────────────────────────────
    // JOIN USER-SPECIFIC ROOM
    // Client must emit: socket.emit("join", userId)
    // After joining, server will send notifications to: `user-${userId}`
    // ─────────────────────────────────────────────────────────────────────
    socket.on("join", (userId: string) => {
      if (userId) {
        socket.join(`user-${userId}`);
        logger.info(
          colors.green(`✅ User ${userId} joined room: user-${userId}`)
        );
      }
    });

    // ─────────────────────────────────────────────────────────────────────
    // LEAVE USER-SPECIFIC ROOM
    // ─────────────────────────────────────────────────────────────────────
    socket.on("leave", (userId: string) => {
      if (userId) {
        socket.leave(`user-${userId}`);
        logger.info(
          colors.yellow(`❌ User ${userId} left room: user-${userId}`)
        );
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