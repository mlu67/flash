import { io } from 'socket.io-client';

const isDev = import.meta.env.DEV;
const URL = isDev ? 'http://localhost:3001' : undefined; // production: same origin via Firebase proxy

const socket = io(URL, {
  withCredentials: true,
  autoConnect: true,
  auth: {
    playerId: sessionStorage.getItem('playerId'),
  },
});

let playerId = sessionStorage.getItem('playerId');

socket.on('player-id', ({ playerId: id }) => {
  playerId = id;
  sessionStorage.setItem('playerId', id);
});

export function getPlayerId() {
  return playerId;
}

export function saveSession(roomCode, playerName) {
  sessionStorage.setItem('roomCode', roomCode);
  sessionStorage.setItem('playerName', playerName);
}

export function clearSession() {
  sessionStorage.removeItem('roomCode');
  sessionStorage.removeItem('playerName');
}

export function getSavedSession() {
  const roomCode = sessionStorage.getItem('roomCode');
  const playerName = sessionStorage.getItem('playerName');
  if (roomCode && playerName) return { roomCode, playerName };
  return null;
}

export default socket;
