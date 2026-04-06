import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cookieParser from 'cookie-parser';
import { v4 as uuidv4 } from 'uuid';
import geoip from 'geoip-lite';
import { registerHandlers } from './socket-handlers.js';
import { cleanupStaleRooms } from './room-manager.js';
import logger from './logger.js';

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

const MAX_CONNECTIONS = parseInt(process.env.MAX_CONNECTIONS, 10) || 800;

io.use((socket, next) => {
  if (io.engine.clientsCount >= MAX_CONNECTIONS) {
    logger.warn({ event_type: 'connection_rejected', current_connections: io.engine.clientsCount }, 'Max connections reached');
    return next(new Error('Server is full, please try again later'));
  }
  let playerId = socket.handshake.auth?.playerId || null;
  if (!playerId) {
    playerId = uuidv4();
  }
  socket.playerId = playerId;
  next();
});

io.on('connection', (socket) => {
  const forwarded = socket.handshake.headers['x-forwarded-for'];
  const ip = forwarded ? forwarded.split(',')[0].trim() : socket.handshake.address;
  const geo = geoip.lookup(ip);
  const region = geo ? `${geo.city || '?'}, ${geo.country}` : 'unknown';
  logger.info({ event_type: 'connection', player_id: socket.playerId, ip, region }, 'Player connected');
  socket.emit('player-id', { playerId: socket.playerId });
  registerHandlers(io, socket);
});

setInterval(cleanupStaleRooms, 5 * 60 * 1000);

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  logger.info({ event_type: 'server_started', port: PORT }, 'Server started');
});
