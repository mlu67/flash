const rooms = new Map();
const playerRoomMap = new Map();

const STALE_TIMEOUT_MS = 30 * 60 * 1000;

export function generateRoomCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code;
  do {
    code = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  } while (rooms.has(code));
  return code;
}

export function createRoom(playerId, playerName, category, questionCount) {
  const roomCode = generateRoomCode();
  const room = {
    roomCode,
    hostId: playerId,
    settings: { category, questionCount },
    players: [
      {
        id: playerId,
        name: playerName,
        score: 0,
        connected: true,
        answers: [],
      },
    ],
    status: 'lobby',
    currentQuestionIndex: -1,
    questions: [],
    playersAnswered: new Set(),
    lastActivity: Date.now(),
  };
  rooms.set(roomCode, room);
  playerRoomMap.set(playerId, roomCode);
  return room;
}

export function joinRoom(roomCode, playerId, playerName) {
  const room = rooms.get(roomCode);
  if (!room) return null;

  const existing = room.players.find(p => p.id === playerId);
  if (existing) {
    existing.connected = true;
    existing.name = playerName;
  } else {
    room.players.push({
      id: playerId,
      name: playerName,
      score: 0,
      connected: true,
      answers: [],
    });
  }

  playerRoomMap.set(playerId, roomCode);
  room.lastActivity = Date.now();
  return room;
}

export function getRoom(roomCode) {
  return rooms.get(roomCode);
}

export function getRoomByPlayerId(playerId) {
  const roomCode = playerRoomMap.get(playerId);
  if (!roomCode) return undefined;
  return rooms.get(roomCode);
}

export function removeRoom(roomCode) {
  const room = rooms.get(roomCode);
  if (room) {
    room.players.forEach(p => playerRoomMap.delete(p.id));
    rooms.delete(roomCode);
  }
}

export function cleanupStaleRooms() {
  const now = Date.now();
  for (const [code, room] of rooms) {
    if (now - room.lastActivity > STALE_TIMEOUT_MS) {
      removeRoom(code);
    }
  }
}

export function clearAllRooms() {
  rooms.clear();
  playerRoomMap.clear();
}
