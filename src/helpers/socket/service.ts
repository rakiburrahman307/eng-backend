import { Server } from 'socket.io';
import { logger } from '../../shared/logger';

class SocketService {
     public io!: Server;

     init(io: Server) {
          this.io = io;
     }

     get instance(): Server {
          if (!this.io) throw new Error('SocketService not initialized. Call init(io) first.');
          return this.io;
     }

     emit(event: string, userId: string, data: unknown) {
          this.instance.to(userId).emit(event, data);
     }

     // General notification to a single user
     notification(userId: string, data: unknown) {
          this.emit('notification', userId, data);
     }

     // Broadcast notification to all users
     notificationAll(data: unknown) {
          this.instance.emit('notification::all', data);
     }
}

export const socketService = new SocketService();
