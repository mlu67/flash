import { createRoom, joinRoom, getRoom, getRoomByPlayerId, removeRoom } from './room-manager.js';
import { startGame, submitAnswer, checkQuestionComplete, markTimedOut, advanceQuestion, getCurrentQuestion, getQuestionResult, getLeaderboard } from './game-loop.js';
import { getCategories } from './words.js';

const QUESTION_TIMEOUT_MS = 10_000;
const RESULT_PAUSE_MS = 2_000;
const roomTimers = new Map();

function clearRoomTimer(roomCode) {
  const timerId = roomTimers.get(roomCode);
  if (timerId) {
    clearTimeout(timerId);
    roomTimers.delete(roomCode);
  }
}

function emitQuestionResult(io, room) {
  clearRoomTimer(room.roomCode);
  markTimedOut(room);
  const result = getQuestionResult(room);
  io.to(room.roomCode).emit('question-result', result);

  const pauseTimer = setTimeout(() => {
    const hasMore = advanceQuestion(room);
    if (hasMore) {
      sendNextQuestion(io, room);
    } else {
      room.status = 'results';
      const leaderboard = getLeaderboard(room);
      const scores = leaderboard.map(p => `${p.name}: ${p.score}`).join(', ');
      console.log(`[Room ${room.roomCode}] Game ended — ${scores}`);
      io.to(room.roomCode).emit('game-over', { leaderboard });
    }
  }, RESULT_PAUSE_MS);
  roomTimers.set(room.roomCode + ':pause', pauseTimer);
}

function sendNextQuestion(io, room) {
  const question = getCurrentQuestion(room);
  io.to(room.roomCode).emit('new-question', question);

  const timer = setTimeout(() => {
    emitQuestionResult(io, room);
  }, QUESTION_TIMEOUT_MS);
  roomTimers.set(room.roomCode, timer);
}

export function registerHandlers(io, socket) {
  const playerId = socket.playerId;

  socket.on('get-categories', (callback) => {
    callback(getCategories());
  });

  socket.on('create-room', ({ playerName, category, questionCount }) => {
    const room = createRoom(playerId, playerName, category, questionCount);
    console.log(`[Room ${room.roomCode}] Host "${playerName}" created room`);
    socket.join(room.roomCode);
    socket.emit('room-created', { roomCode: room.roomCode });
    socket.emit('player-joined', {
      players: room.players.map(p => ({ id: p.id, name: p.name, connected: p.connected })),
    });
  });

  socket.on('join-room', ({ roomCode, playerName }) => {
    const code = roomCode.toUpperCase();
    const room = joinRoom(code, playerId, playerName);
    if (room) {
      console.log(`[Room ${code}] Player "${playerName}" joined`);
    }
    if (!room) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }
    socket.join(code);
    // Cancel grace period timer if someone is reconnecting
    clearRoomTimer(code + ':grace');
    if (room.status !== 'lobby') {
      socket.emit('rejoin', {
        roomCode: code,
        status: room.status,
        currentQuestion: room.status === 'playing' ? getCurrentQuestion(room) : null,
        players: room.players.map(p => ({ id: p.id, name: p.name, score: p.score })),
        totalQuestions: room.questions.length,
        isHost: playerId === room.hostId,
      });
    } else {
      socket.emit('rejoin', {
        roomCode: code,
        status: 'lobby',
        players: room.players.map(p => ({ id: p.id, name: p.name, connected: p.connected })),
        totalQuestions: 0,
        isHost: playerId === room.hostId,
      });
    }
    io.to(code).emit('player-joined', {
      players: room.players.map(p => ({ id: p.id, name: p.name, connected: p.connected })),
    });
  });

  socket.on('start-game', ({ roomCode }) => {
    const room = getRoom(roomCode);
    if (!room || room.hostId !== playerId) {
      socket.emit('error', { message: 'Only the host can start the game' });
      return;
    }
    startGame(room);
    const playerNames = room.players.map(p => p.name).join(', ');
    console.log(`[Room ${roomCode}] Game started — category: ${room.category || 'All'}, questions: ${room.questions.length}, players: [${playerNames}]`);
    io.to(roomCode).emit('game-started', { totalQuestions: room.questions.length });
    sendNextQuestion(io, room);
  });

  socket.on('submit-answer', ({ roomCode, article }) => {
    const room = getRoom(roomCode);
    if (!room || room.status !== 'playing') return;
    const result = submitAnswer(room, playerId, article);
    if (!result) return;
    io.to(roomCode).emit('player-answered', { playerId, playerName: room.players.find(p => p.id === playerId)?.name });
    if (checkQuestionComplete(room)) {
      emitQuestionResult(io, room);
    }
  });

  socket.on('play-again', ({ roomCode }) => {
    const room = getRoom(roomCode);
    if (!room || room.hostId !== playerId) return;
    startGame(room);
    io.to(roomCode).emit('game-started', { totalQuestions: room.questions.length });
    sendNextQuestion(io, room);
  });

  socket.on('end-game', ({ roomCode }) => {
    const room = getRoom(roomCode);
    if (!room || room.hostId !== playerId) return;
    clearRoomTimer(roomCode);
    clearRoomTimer(roomCode + ':pause');
    io.to(roomCode).emit('game-ended');
    removeRoom(roomCode);
  });

  socket.on('disconnect', () => {
    const room = getRoomByPlayerId(playerId);
    if (!room) return;
    const player = room.players.find(p => p.id === playerId);
    if (player) player.connected = false;
    const allDisconnected = room.players.every(p => !p.connected);
    if (allDisconnected) {
      // Grace period: wait 5s before removing the room so refreshing players can reconnect
      const graceTimer = setTimeout(() => {
        const currentRoom = getRoom(room.roomCode);
        if (!currentRoom) return;
        const stillAllDisconnected = currentRoom.players.every(p => !p.connected);
        if (stillAllDisconnected) {
          clearRoomTimer(currentRoom.roomCode);
          clearRoomTimer(currentRoom.roomCode + ':pause');
          removeRoom(currentRoom.roomCode);
        }
      }, 5000);
      roomTimers.set(room.roomCode + ':grace', graceTimer);
      return;
    }
    if (room.status === 'playing' && checkQuestionComplete(room)) {
      emitQuestionResult(io, room);
    }
  });
}
