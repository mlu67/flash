import { describe, it, expect, beforeEach } from 'vitest';
import { createRoom, joinRoom, getRoom, removeRoom, getRoomByPlayerId, generateRoomCode, cleanupStaleRooms, clearAllRooms } from '../src/room-manager.js';

beforeEach(() => {
  clearAllRooms();
});

describe('room-manager', () => {
  describe('generateRoomCode', () => {
    it('generates a 6-character uppercase alphanumeric code', () => {
      const code = generateRoomCode();
      expect(code).toMatch(/^[A-Z0-9]{6}$/);
    });

    it('generates unique codes', () => {
      const codes = new Set(Array.from({ length: 100 }, () => generateRoomCode()));
      expect(codes.size).toBe(100);
    });
  });

  describe('createRoom', () => {
    it('creates a room with correct initial state', () => {
      const room = createRoom('player-1', 'Alice', 'all', 10);
      expect(room.roomCode).toMatch(/^[A-Z0-9]{6}$/);
      expect(room.hostId).toBe('player-1');
      expect(room.settings.category).toBe('all');
      expect(room.settings.questionCount).toBe(10);
      expect(room.status).toBe('lobby');
      expect(room.players).toHaveLength(1);
      expect(room.players[0]).toMatchObject({
        id: 'player-1',
        name: 'Alice',
        score: 0,
        connected: true,
      });
    });
  });

  describe('joinRoom', () => {
    it('adds a player to an existing room', () => {
      const room = createRoom('player-1', 'Alice', 'all', 10);
      const updated = joinRoom(room.roomCode, 'player-2', 'Bob');
      expect(updated.players).toHaveLength(2);
      expect(updated.players[1].name).toBe('Bob');
    });

    it('returns null for non-existent room', () => {
      const result = joinRoom('ZZZZZZ', 'player-2', 'Bob');
      expect(result).toBeNull();
    });

    it('reconnects an existing player', () => {
      const room = createRoom('player-1', 'Alice', 'all', 10);
      room.players[0].connected = false;
      const updated = joinRoom(room.roomCode, 'player-1', 'Alice');
      expect(updated.players).toHaveLength(1);
      expect(updated.players[0].connected).toBe(true);
    });
  });

  describe('getRoom / getRoomByPlayerId', () => {
    it('retrieves room by code', () => {
      const room = createRoom('player-1', 'Alice', 'all', 10);
      expect(getRoom(room.roomCode)).toBe(room);
    });

    it('retrieves room by player ID', () => {
      const room = createRoom('player-1', 'Alice', 'all', 10);
      expect(getRoomByPlayerId('player-1')).toBe(room);
    });
  });

  describe('removeRoom', () => {
    it('deletes a room', () => {
      const room = createRoom('player-1', 'Alice', 'all', 10);
      removeRoom(room.roomCode);
      expect(getRoom(room.roomCode)).toBeUndefined();
    });
  });

  describe('cleanupStaleRooms', () => {
    it('removes rooms with no activity for 30+ minutes', () => {
      const room = createRoom('player-1', 'Alice', 'all', 10);
      room.lastActivity = Date.now() - 31 * 60 * 1000;
      cleanupStaleRooms();
      expect(getRoom(room.roomCode)).toBeUndefined();
    });

    it('keeps active rooms', () => {
      const room = createRoom('player-1', 'Alice', 'all', 10);
      cleanupStaleRooms();
      expect(getRoom(room.roomCode)).toBeDefined();
    });
  });
});
