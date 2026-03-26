import { io } from 'socket.io-client';

const URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

const socket = io(URL, {
  withCredentials: true,
  autoConnect: true,
});

let playerId = localStorage.getItem('playerId');

socket.on('player-id', ({ playerId: id }) => {
  playerId = id;
  localStorage.setItem('playerId', id);
});

export function getPlayerId() {
  return playerId;
}

export default socket;
