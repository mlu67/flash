import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cookieParser from 'cookie-parser';
import { v4 as uuidv4 } from 'uuid';
import { registerHandlers } from './socket-handlers.js';
import { cleanupStaleRooms } from './room-manager.js';

const app = express();
const httpServer = createServer(app);

const allowedOrigins = process.env.CLIENT_ORIGIN
  ? process.env.CLIENT_ORIGIN.split(',')
  : ['http://localhost:5173'];

const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
});

app.use(cookieParser());

app.get('/health', (req, res) => res.send('ok'));

io.use((socket, next) => {
  let playerId = socket.handshake.auth?.playerId || null;
  if (!playerId) {
    playerId = uuidv4();
  }
  socket.playerId = playerId;
  next();
});

io.on('connection', (socket) => {
  socket.emit('player-id', { playerId: socket.playerId });
  registerHandlers(io, socket);
});

setInterval(cleanupStaleRooms, 5 * 60 * 1000);

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
