import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { startGame, submitAnswer, checkQuestionComplete, getLeaderboard } from '../src/game-loop.js';

function makeRoom(playerCount = 2, questionCount = 3) {
  return {
    roomCode: 'TEST01',
    hostId: 'p1',
    settings: { category: 'all', questionCount },
    players: Array.from({ length: playerCount }, (_, i) => ({
      id: `p${i + 1}`,
      name: `Player${i + 1}`,
      score: 0,
      connected: true,
      answers: [],
    })),
    status: 'lobby',
    currentQuestionIndex: -1,
    questions: [],
    playersAnswered: new Set(),
    lastActivity: Date.now(),
  };
}

describe('game-loop', () => {
  describe('startGame', () => {
    it('selects and shuffles questions, sets status to playing', () => {
      const room = makeRoom(2, 5);
      startGame(room);
      expect(room.status).toBe('playing');
      expect(room.questions).toHaveLength(5);
      expect(room.currentQuestionIndex).toBe(0);
      room.questions.forEach(q => {
        expect(q).toHaveProperty('noun');
        expect(q).toHaveProperty('article');
        expect(q).toHaveProperty('category');
      });
    });

    it('filters by category when not "all"', () => {
      const room = makeRoom(1, 5);
      room.settings.category = 'animals';
      startGame(room);
      room.questions.forEach(q => {
        expect(q.category).toBe('animals');
      });
    });

    it('resets player scores and answers', () => {
      const room = makeRoom(2, 3);
      room.players[0].score = 5;
      room.players[0].answers = [{ noun: 'x', selected: 'der', correct: true, timedOut: false }];
      startGame(room);
      room.players.forEach(p => {
        expect(p.score).toBe(0);
        expect(p.answers).toHaveLength(0);
      });
    });
  });

  describe('submitAnswer', () => {
    it('records a correct answer and awards 1 point', () => {
      const room = makeRoom(2, 3);
      startGame(room);
      const correctArticle = room.questions[0].article;
      const result = submitAnswer(room, 'p1', correctArticle);
      expect(result.correct).toBe(true);
      expect(room.players[0].score).toBe(1);
      expect(room.playersAnswered.has('p1')).toBe(true);
    });

    it('records a wrong answer with 0 points', () => {
      const room = makeRoom(2, 3);
      startGame(room);
      const wrongArticle = room.questions[0].article === 'der' ? 'die' : 'der';
      const result = submitAnswer(room, 'p1', wrongArticle);
      expect(result.correct).toBe(false);
      expect(room.players[0].score).toBe(0);
    });

    it('ignores duplicate answers from same player', () => {
      const room = makeRoom(2, 3);
      startGame(room);
      const article = room.questions[0].article;
      submitAnswer(room, 'p1', article);
      const result = submitAnswer(room, 'p1', 'die');
      expect(result).toBeNull();
      expect(room.players[0].score).toBe(1);
    });
  });

  describe('checkQuestionComplete', () => {
    it('returns true when all connected players answered', () => {
      const room = makeRoom(2, 3);
      startGame(room);
      submitAnswer(room, 'p1', 'der');
      submitAnswer(room, 'p2', 'die');
      expect(checkQuestionComplete(room)).toBe(true);
    });

    it('returns false when some connected players have not answered', () => {
      const room = makeRoom(2, 3);
      startGame(room);
      submitAnswer(room, 'p1', 'der');
      expect(checkQuestionComplete(room)).toBe(false);
    });

    it('ignores disconnected players', () => {
      const room = makeRoom(2, 3);
      startGame(room);
      room.players[1].connected = false;
      submitAnswer(room, 'p1', 'der');
      expect(checkQuestionComplete(room)).toBe(true);
    });
  });

  describe('getLeaderboard', () => {
    it('returns players sorted by score descending', () => {
      const room = makeRoom(3, 2);
      startGame(room);
      room.players[0].score = 1;
      room.players[1].score = 3;
      room.players[2].score = 2;
      room.players.forEach(p => {
        p.answers = [
          { noun: 'X', selected: 'der', correct: true, timedOut: false },
          { noun: 'Y', selected: null, correct: false, timedOut: true },
        ];
      });
      const lb = getLeaderboard(room);
      expect(lb[0].name).toBe('Player2');
      expect(lb[1].name).toBe('Player3');
      expect(lb[2].name).toBe('Player1');
      lb.forEach(entry => {
        expect(entry).toHaveProperty('accuracy');
        expect(entry).toHaveProperty('timeouts');
      });
    });
  });
});
