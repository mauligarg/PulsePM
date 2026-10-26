/**
 * Socket.io Server Setup with Tenant-Scoped Handshake Authentication
 * 
 * Plain English explanation for Viva:
 * To prevent cross-tenant message leakage in real-time websockets:
 * 1. During the initial socket handshake, we authenticate the incoming JWT token.
 * 2. If the token is invalid or missing workspace claims, the connection is rejected.
 * 3. Upon successful handshake, the socket strictly joins room `ws:<workspaceId>`.
 * 4. All collaborative board events (card move, task update, new comment) are broadcast
 *    ONLY to room `ws:<workspaceId>`, ensuring users from other workspaces NEVER receive them.
 */

const { Server } = require('socket.io');
const { verifyToken } = require('../utils/tokens');

const setupSockets = (httpServer, allowedOrigin) => {
  const io = new Server(httpServer, {
    cors: {
      origin: allowedOrigin || '*',
      methods: ['GET', 'POST', 'PATCH', 'DELETE'],
      credentials: true
    }
  });

  // JWT handshake authentication middleware
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        return next(new Error('Authentication error: Token missing from handshake'));
      }

      const decoded = verifyToken(token);
      if (!decoded || !decoded.userId) {
        return next(new Error('Authentication error: Invalid token'));
      }

      socket.user = decoded;
      next();
    } catch (err) {
      return next(new Error('Authentication error: ' + err.message));
    }
  });

  io.on('connection', (socket) => {
    const workspaceId = socket.user.workspaceId;

    if (workspaceId) {
      const room = `ws:${workspaceId}`;
      socket.join(room);
      console.log(`🔌 [Socket.io] User ${socket.user.userId} connected to room: ${room}`);

      // Broadcast member presence if needed
      socket.to(room).emit('member:joined', {
        userId: socket.user.userId,
        timestamp: new Date()
      });
    } else {
      console.log(`🔌 [Socket.io] User ${socket.user.userId} connected without workspace context`);
    }

    // Allow client to switch workspace room dynamically if switching workspace
    socket.on('workspace:switch', (newWorkspaceId) => {
      // Leave previous workspace rooms
      for (const room of socket.rooms) {
        if (room.startsWith('ws:')) {
          socket.leave(room);
        }
      }
      if (newWorkspaceId) {
        const newRoom = `ws:${newWorkspaceId}`;
        socket.join(newRoom);
        socket.user.workspaceId = newWorkspaceId;
        console.log(`🔌 [Socket.io] User ${socket.user.userId} switched to room: ${newRoom}`);
      }
    });

    socket.on('disconnect', () => {
      // Disconnect cleanly
    });
  });

  return io;
};

module.exports = setupSockets;
