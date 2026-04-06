import { createRoom, joinRoom, getRoom, getRoomByPlayerId, removeRoom } from './room-manager.js';
import { startGame, submitAnswer, checkQuestionComplete, markTimedOut, advanceQuestion, getCurrentQuestion, getQuestionResult, getLeaderboard } from './game-loop.js';
import { getCategories } from './words.js';
import logger from './logger.js';

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
      logger.info({ event_type: 'game_ended', room_code: room.roomCode, leaderboard, player_count: room.players.length }, 'Game ended');
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

function safe(handler) {
  return (...args) => {
    try {
      handler(...args);
    } catch (err) {
      logger.error({ event_type: 'unhandled_error', err: { message: err.message, stack: err.stack } }, 'Unhandled error in socket handler');
    }
  };
}

export function registerHandlers(io, socket) {
  const playerId = socket.playerId;

  logger.info({ event_type: 'player_connected', player_id: playerId }, 'Player connected');

  socket.on('get-categories', (callback) => {
    callback(getCategories());
  });

  socket.on('create-room', safe(({ playerName, category, questionCount }) => {
    const room = createRoom(playerId, playerName, category, questionCount);
    logger.info({ event_type: 'room_created', room_code: room.roomCode, player_name: playerName }, 'Room created');
    socket.join(room.roomCode);
    socket.emit('room-created', { roomCode: room.roomCode });
    socket.emit('player-joined', {
      players: room.players.map(p => ({ id: p.id, name: p.name, connected: p.connected })),
    });
  }));

  socket.on('join-room', safe(({ roomCode, playerName }) => {
    const code = roomCode.toUpperCase();
    const room = joinRoom(code, playerId, playerName);
    if (room) {
      logger.info({ event_type: 'player_joined', room_code: code, player_name: playerName }, 'Player joined');
    }
    if (!room) {
      logger.warn({ event_type: 'join_room_failed', room_code: code, player_id: playerId }, 'Player tried to join non-existent room');
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
  }));

  socket.on('start-game', safe(({ roomCode }) => {
    const room = getRoom(roomCode);
    if (!room || room.hostId !== playerId) {
      logger.warn({ event_type: 'start_game_denied', room_code: roomCode, player_id: playerId, reason: !room ? 'room_not_found' : 'not_host' }, 'Unauthorized start-game attempt');
      socket.emit('error', { message: 'Only the host can start the game' });
      return;
    }
    startGame(room);
    logger.info({ event_type: 'game_started', room_code: roomCode, category: room.category || 'All', question_count: room.questions.length, player_count: room.players.length, players: room.players.map(p => p.name) }, 'Game started');
    io.to(roomCode).emit('game-started', { totalQuestions: room.questions.length });
    sendNextQuestion(io, room);
  }));

  socket.on('submit-answer', safe(({ roomCode, article }) => {
    const room = getRoom(roomCode);
    if (!room || room.status !== 'playing') {
      logger.warn({ event_type: 'submit_answer_rejected', room_code: roomCode, player_id: playerId, reason: !room ? 'room_not_found' : `room_status_${room.status}` }, 'Answer submitted to invalid room');
      return;
    }
    const result = submitAnswer(room, playerId, article);
    if (!result) return;
    io.to(roomCode).emit('player-answered', { playerId, playerName: room.players.find(p => p.id === playerId)?.name });
    if (checkQuestionComplete(room)) {
      emitQuestionResult(io, room);
    }
  }));

  socket.on('play-again', safe(({ roomCode }) => {
    const room = getRoom(roomCode);
    if (!room || room.hostId !== playerId) return;
    startGame(room);
    io.to(roomCode).emit('game-started', { totalQuestions: room.questions.length });
    sendNextQuestion(io, room);
  }));

  socket.on('end-game', safe(({ roomCode }) => {
    const room = getRoom(roomCode);
    if (!room || room.hostId !== playerId) return;
    clearRoomTimer(roomCode);
    clearRoomTimer(roomCode + ':pause');
    io.to(roomCode).emit('game-ended');
    removeRoom(roomCode);
  }));

  socket.on('disconnect', safe(() => {
    const room = getRoomByPlayerId(playerId);
    const playerName = room?.players.find(p => p.id === playerId)?.name;
    logger.info({ event_type: 'player_disconnected', player_id: playerId, player_name: playerName, room_code: room?.roomCode }, 'Player disconnected');
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
  }));
}
