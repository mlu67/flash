import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cookieParser from 'cookie-parser';
import { v4 as uuidv4 } from 'uuid';
import { registerHandlers } from './socket-handlers.js';
import { cleanupStaleRooms } from './room-manager.js';

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
    credentials: true,
  },
});

app.use(cookieParser());

app.get('/health', (req, res) => res.send('ok'));

io.use((socket, next) => {
  const cookies = socket.handshake.headers.cookie;
  let playerId = null;
  if (cookies) {
    const match = cookies.match(/playerId=([^;]+)/);
    if (match) playerId = match[1];
  }
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
