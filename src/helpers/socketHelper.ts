import colors from "colors";
import { Server, Socket } from "socket.io";
import { logger } from "../shared/logger";
import { socketService } from "./socket/service";

const socket = (io: Server) => {
  // Initialize SocketService
  socketService.init(io);

  io.on("connection", (socket: Socket) => {
    logger.info(colors.blue("A User connected: " + socket.id));

    // ─────────────────────────────────────────────────────────────────────
    // JOIN USER-SPECIFIC ROOM
    // Client must emit: socket.emit("join", userId)
    // After joining, server will send notifications to: `user-${userId}`
    // ─────────────────────────────────────────────────────────────────────
    socket.on("join", (userId: string) => {
      if (userId) {
        socket.join(userId);
        socket.join(`user-${userId}`);
        logger.info(
          colors.green(`✅ User ${userId} joined room: ${userId} & user-${userId}`)
        );
      }
    });

    // ─────────────────────────────────────────────────────────────────────
    // LEAVE USER-SPECIFIC ROOM
    // ─────────────────────────────────────────────────────────────────────
    socket.on("leave", (userId: string) => {
      if (userId) {
        socket.leave(userId);
        socket.leave(`user-${userId}`);
        logger.info(
          colors.yellow(`❌ User ${userId} left room: ${userId} & user-${userId}`)
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