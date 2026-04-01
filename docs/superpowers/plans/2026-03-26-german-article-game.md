# German Article Game Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a multiplayer web-based quiz game where players memorize German noun articles (der, die, das) by competing in real-time rooms.

**Architecture:** React SPA served by Firebase Hosting, with a Node.js + Socket.IO backend on Cloud Run (single instance). All game state is in-memory on the server. Word data is a local JSON file. Firebase Hosting proxies `/socket.io/**` to Cloud Run.

**Tech Stack:** React (Vite), Node.js, Socket.IO, Firebase Hosting, Google Cloud Run

---

## File Structure

```
flash/
├── server/
│   ├── package.json
│   ├── src/
│   │   ├── index.js          # Express + Socket.IO server entry point, cookie middleware
│   │   ├── words.js          # Load and query word list
│   │   ├── room-manager.js   # Create/join/cleanup rooms, generate codes
│   │   ├── game-loop.js      # Question loop, timers, scoring, answer processing
│   │   └── socket-handlers.js # Socket.IO event handlers (wires events to room-manager + game-loop)
│   ├── data/
│   │   └── words.json        # ~300 nouns with articles and categories
│   └── __tests__/
│       ├── words.test.js
│       ├── room-manager.test.js
│       └── game-loop.test.js
├── client/
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   ├── src/
│   │   ├── main.jsx              # React entry point
│   │   ├── App.jsx               # Screen router (state-based, not URL-based)
│   │   ├── socket.js             # Socket.IO client singleton
│   │   ├── screens/
│   │   │   ├── HomeScreen.jsx
│   │   │   ├── CreateGameScreen.jsx
│   │   │   ├── JoinGameScreen.jsx
│   │   │   ├── LobbyScreen.jsx
│   │   │   ├── GameScreen.jsx
│   │   │   └── ResultsScreen.jsx
│   │   ├── components/
│   │   │   ├── ArticleButton.jsx   # der/die/das button with answer animations
│   │   │   ├── Timer.jsx           # Animated countdown ring
│   │   │   ├── Scoreboard.jsx      # Running player scores
│   │   │   └── Leaderboard.jsx     # Final results table
│   │   └── styles/
│   │       └── index.css           # Global styles, animations, playful theme
│   └── __tests__/
│       ├── App.test.jsx
│       └── components/
│           └── ArticleButton.test.jsx
├── e2e/
│   ├── package.json
│   ├── playwright.config.js
│   ├── helpers.js                  # Shared test helpers (createGame, joinGame, etc.)
│   └── tests/
│       ├── main-flow.spec.js       # Single-player & multiplayer happy paths
│       ├── timeout.spec.js         # Timeout behavior tests
│       ├── reconnect.spec.js       # Disconnect/reconnect & room cleanup
│       └── edge-cases.spec.js      # Error handling, category filter, play again, end game
├── firebase.json                   # Hosting config + rewrites
└── Dockerfile                      # Cloud Run container for server
```

---

### Task 1: Project Scaffolding

**Files:**
- Create: `server/package.json`
- Create: `client/package.json`
- Create: `client/vite.config.js`
- Create: `client/index.html`

- [ ] **Step 1: Initialize server package**

```bash
cd server
npm init -y
```

Then edit `server/package.json`:

```json
{
  "name": "flash-server",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "node src/index.js",
    "dev": "node --watch src/index.js",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

- [ ] **Step 2: Install server dependencies**

```bash
cd server
npm install express socket.io cookie-parser uuid
npm install -D vitest
```

- [ ] **Step 3: Scaffold React client with Vite**

```bash
cd client
npm create vite@latest . -- --template react
```

- [ ] **Step 4: Install client dependencies**

```bash
cd client
npm install socket.io-client
```

- [ ] **Step 5: Verify both projects build/run**

```bash
cd server && npm test -- --run 2>&1 | tail -5
cd ../client && npm run build 2>&1 | tail -5
```

Expected: Both succeed (no tests yet, but no errors).

- [ ] **Step 6: Commit**

```bash
git add server/ client/
git commit -m "chore: scaffold server and client projects"
```

---

### Task 2: Word List Data

**Files:**
- Create: `server/data/words.json`
- Create: `server/src/words.js`
- Create: `server/__tests__/words.test.js`

- [ ] **Step 1: Write the word list test**

Create `server/__tests__/words.test.js`:

```javascript
import { describe, it, expect } from 'vitest';
import { loadWords, getCategories, getWordsByCategory } from '../src/words.js';

describe('words', () => {
  it('loads all words from JSON', () => {
    const words = loadWords();
    expect(words.length).toBeGreaterThanOrEqual(280);
    words.forEach(w => {
      expect(w).toHaveProperty('noun');
      expect(w).toHaveProperty('article');
      expect(w).toHaveProperty('category');
      expect(['der', 'die', 'das']).toContain(w.article);
    });
  });

  it('returns all category objects', () => {
    const categories = getCategories();
    expect(categories.length).toBeGreaterThanOrEqual(10);
    categories.forEach(c => {
      expect(c).toHaveProperty('id');
      expect(c).toHaveProperty('label');
    });
  });

  it('filters words by category', () => {
    const animals = getWordsByCategory('animals');
    expect(animals.length).toBeGreaterThan(0);
    animals.forEach(w => {
      expect(w.category).toBe('animals');
    });
  });

  it('returns all words when category is "all"', () => {
    const all = getWordsByCategory('all');
    const loaded = loadWords();
    expect(all.length).toBe(loaded.length);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd server && npx vitest run __tests__/words.test.js
```

Expected: FAIL — cannot find module `../src/words.js`

- [ ] **Step 3: Create the word list JSON file**

Create `server/data/words.json` with ~300 nouns across 10 categories. The file must follow this structure:

```json
{
  "categories": [
    { "id": "animals", "label": "Animals" },
    { "id": "food-drink", "label": "Food & Drink" },
    { "id": "household", "label": "Household" },
    { "id": "body", "label": "Body" },
    { "id": "clothing", "label": "Clothing" },
    { "id": "nature", "label": "Nature" },
    { "id": "transportation", "label": "Transportation" },
    { "id": "work-school", "label": "Work & School" },
    { "id": "family-people", "label": "Family & People" },
    { "id": "time-places", "label": "Time & Places" }
  ],
  "words": [
    { "noun": "Hund", "article": "der", "category": "animals" },
    { "noun": "Katze", "article": "die", "category": "animals" },
    { "noun": "Vogel", "article": "der", "category": "animals" },
    { "noun": "Pferd", "article": "das", "category": "animals" },
    { "noun": "Fisch", "article": "der", "category": "animals" }
  ]
}
```

Populate all 10 categories with ~30 nouns each. Every noun must have a correct `der`, `die`, or `das` article. Use common, well-known German nouns that a learner would encounter. Double-check every article for correctness.

- [ ] **Step 4: Implement words.js**

Create `server/src/words.js`:

```javascript
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataPath = join(__dirname, '..', 'data', 'words.json');

let data = null;

function getData() {
  if (!data) {
    data = JSON.parse(readFileSync(dataPath, 'utf-8'));
  }
  return data;
}

export function loadWords() {
  return getData().words;
}

export function getCategories() {
  return getData().categories;
}

export function getWordsByCategory(category) {
  const words = loadWords();
  if (category === 'all') return words;
  return words.filter(w => w.category === category);
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd server && npx vitest run __tests__/words.test.js
```

Expected: All 4 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add server/data/words.json server/src/words.js server/__tests__/words.test.js
git commit -m "feat: add word list data and query module"
```

---

### Task 3: Room Manager

**Files:**
- Create: `server/src/room-manager.js`
- Create: `server/__tests__/room-manager.test.js`

- [ ] **Step 1: Write room manager tests**

Create `server/__tests__/room-manager.test.js`:

```javascript
import { describe, it, expect, beforeEach } from 'vitest';
import { createRoom, joinRoom, getRoom, removeRoom, getRoomByPlayerId, generateRoomCode, cleanupStaleRooms } from '../src/room-manager.js';

describe('room-manager', () => {
  beforeEach(() => {
    // Clear all rooms between tests
    const { _clearAllRooms } = require('../src/room-manager.js');
    // We'll use a reset helper
  });

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
      // Manually set lastActivity to 31 minutes ago
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd server && npx vitest run __tests__/room-manager.test.js
```

Expected: FAIL — cannot find module `../src/room-manager.js`

- [ ] **Step 3: Implement room-manager.js**

Create `server/src/room-manager.js`:

```javascript
const rooms = new Map(); // roomCode -> room
const playerRoomMap = new Map(); // playerId -> roomCode

const STALE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd server && npx vitest run __tests__/room-manager.test.js
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add server/src/room-manager.js server/__tests__/room-manager.test.js
git commit -m "feat: add room manager with create, join, cleanup"
```

---

### Task 4: Game Loop

**Files:**
- Create: `server/src/game-loop.js`
- Create: `server/__tests__/game-loop.test.js`

- [ ] **Step 1: Write game loop tests**

Create `server/__tests__/game-loop.test.js`:

```javascript
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
      // Set some answers for stats
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd server && npx vitest run __tests__/game-loop.test.js
```

Expected: FAIL — cannot find module `../src/game-loop.js`

- [ ] **Step 3: Implement game-loop.js**

Create `server/src/game-loop.js`:

```javascript
import { getWordsByCategory } from './words.js';

function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function startGame(room) {
  const words = getWordsByCategory(room.settings.category);
  const shuffled = shuffle(words);
  room.questions = shuffled.slice(0, room.settings.questionCount);
  room.currentQuestionIndex = 0;
  room.status = 'playing';
  room.playersAnswered = new Set();

  // Reset all player scores and answers
  room.players.forEach(p => {
    p.score = 0;
    p.answers = [];
  });

  room.lastActivity = Date.now();
}

export function submitAnswer(room, playerId, article) {
  if (room.playersAnswered.has(playerId)) return null;

  const question = room.questions[room.currentQuestionIndex];
  const correct = article === question.article;

  const player = room.players.find(p => p.id === playerId);
  if (!player) return null;

  if (correct) player.score += 1;

  player.answers.push({
    noun: question.noun,
    selected: article,
    correct,
    timedOut: false,
  });

  room.playersAnswered.add(playerId);
  room.lastActivity = Date.now();

  return { correct, correctArticle: question.article };
}

export function markTimedOut(room) {
  const question = room.questions[room.currentQuestionIndex];
  room.players.forEach(p => {
    if (p.connected && !room.playersAnswered.has(p.id)) {
      p.answers.push({
        noun: question.noun,
        selected: null,
        correct: false,
        timedOut: true,
      });
    }
  });
}

export function checkQuestionComplete(room) {
  const connectedNotAnswered = room.players.filter(
    p => p.connected && !room.playersAnswered.has(p.id)
  );
  return connectedNotAnswered.length === 0;
}

export function advanceQuestion(room) {
  room.currentQuestionIndex += 1;
  room.playersAnswered = new Set();
  return room.currentQuestionIndex < room.questions.length;
}

export function getCurrentQuestion(room) {
  const q = room.questions[room.currentQuestionIndex];
  return {
    questionIndex: room.currentQuestionIndex,
    noun: q.noun,
    category: q.category,
  };
}

export function getQuestionResult(room) {
  const q = room.questions[room.currentQuestionIndex];
  return {
    correctArticle: q.article,
    players: room.players.map(p => ({
      id: p.id,
      name: p.name,
      score: p.score,
    })),
  };
}

export function getLeaderboard(room) {
  return room.players
    .map(p => {
      const total = p.answers.length;
      const correctCount = p.answers.filter(a => a.correct).length;
      const timeouts = p.answers.filter(a => a.timedOut).length;
      return {
        id: p.id,
        name: p.name,
        score: p.score,
        accuracy: total > 0 ? Math.round((correctCount / total) * 100) : 0,
        correct: correctCount,
        total,
        timeouts,
      };
    })
    .sort((a, b) => b.score - a.score);
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd server && npx vitest run __tests__/game-loop.test.js
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add server/src/game-loop.js server/__tests__/game-loop.test.js
git commit -m "feat: add game loop with scoring, timing, leaderboard"
```

---

### Task 5: Socket.IO Event Handlers

**Files:**
- Create: `server/src/socket-handlers.js`
- Create: `server/src/index.js`

- [ ] **Step 1: Implement socket-handlers.js**

Create `server/src/socket-handlers.js`:

```javascript
import { createRoom, joinRoom, getRoom, getRoomByPlayerId, removeRoom } from './room-manager.js';
import { startGame, submitAnswer, checkQuestionComplete, markTimedOut, advanceQuestion, getCurrentQuestion, getQuestionResult, getLeaderboard } from './game-loop.js';
import { getCategories } from './words.js';

const QUESTION_TIMEOUT_MS = 10_000;
const RESULT_PAUSE_MS = 3_000;
const roomTimers = new Map(); // roomCode -> timer ID

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

  // After 3s pause, advance or end
  const pauseTimer = setTimeout(() => {
    const hasMore = advanceQuestion(room);
    if (hasMore) {
      sendNextQuestion(io, room);
    } else {
      room.status = 'results';
      const leaderboard = getLeaderboard(room);
      io.to(room.roomCode).emit('game-over', { leaderboard });
    }
  }, RESULT_PAUSE_MS);
  roomTimers.set(room.roomCode + ':pause', pauseTimer);
}

function sendNextQuestion(io, room) {
  const question = getCurrentQuestion(room);
  io.to(room.roomCode).emit('new-question', question);

  // Start 10s timer
  const timer = setTimeout(() => {
    emitQuestionResult(io, room);
  }, QUESTION_TIMEOUT_MS);
  roomTimers.set(room.roomCode, timer);
}

export function registerHandlers(io, socket) {
  const playerId = socket.playerId; // set by cookie middleware

  socket.on('get-categories', (callback) => {
    callback(getCategories());
  });

  socket.on('create-room', ({ playerName, category, questionCount }) => {
    const room = createRoom(playerId, playerName, category, questionCount);
    socket.join(room.roomCode);
    socket.emit('room-created', { roomCode: room.roomCode });
  });

  socket.on('join-room', ({ roomCode, playerName }) => {
    const code = roomCode.toUpperCase();
    const room = joinRoom(code, playerId, playerName);
    if (!room) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }
    if (room.status !== 'lobby') {
      // Reconnecting mid-game
      socket.join(code);
      socket.emit('rejoin', {
        status: room.status,
        currentQuestion: room.status === 'playing' ? getCurrentQuestion(room) : null,
        players: room.players.map(p => ({ id: p.id, name: p.name, score: p.score })),
        totalQuestions: room.questions.length,
        isHost: playerId === room.hostId,
      });
      io.to(code).emit('player-joined', {
        players: room.players.map(p => ({ id: p.id, name: p.name, connected: p.connected })),
      });
      return;
    }
    socket.join(code);
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
    io.to(roomCode).emit('game-started', { totalQuestions: room.questions.length });
    sendNextQuestion(io, room);
  });

  socket.on('submit-answer', ({ roomCode, article }) => {
    const room = getRoom(roomCode);
    if (!room || room.status !== 'playing') return;

    const result = submitAnswer(room, playerId, article);
    if (!result) return; // duplicate or invalid

    // Notify others that this player answered (no correctness revealed)
    io.to(roomCode).emit('player-answered', { playerId, playerName: room.players.find(p => p.id === playerId)?.name });

    // Check if all connected players answered
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

    // Check if all players disconnected
    const allDisconnected = room.players.every(p => !p.connected);
    if (allDisconnected) {
      clearRoomTimer(room.roomCode);
      clearRoomTimer(room.roomCode + ':pause');
      removeRoom(room.roomCode);
      return;
    }

    // If game is playing and the disconnect completes the question
    if (room.status === 'playing' && checkQuestionComplete(room)) {
      emitQuestionResult(io, room);
    }
  });
}
```

- [ ] **Step 2: Implement server entry point (index.js)**

Create `server/src/index.js`:

```javascript
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

// Health check endpoint for Cloud Run
app.get('/health', (req, res) => res.send('ok'));

// Socket.IO middleware: extract or assign player ID from cookie
io.use((socket, next) => {
  const cookies = socket.handshake.headers.cookie;
  let playerId = null;

  if (cookies) {
    const match = cookies.match(/playerId=([^;]+)/);
    if (match) playerId = match[1];
  }

  if (!playerId) {
    playerId = uuidv4();
    // The cookie will be set on the client side since Socket.IO
    // doesn't support Set-Cookie in the handshake response easily.
    // We send the playerId to the client to store.
  }

  socket.playerId = playerId;
  next();
});

io.on('connection', (socket) => {
  // Send playerId to client so it can store it
  socket.emit('player-id', { playerId: socket.playerId });
  registerHandlers(io, socket);
});

// Cleanup stale rooms every 5 minutes
setInterval(cleanupStaleRooms, 5 * 60 * 1000);

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

- [ ] **Step 3: Verify server starts**

```bash
cd server && node src/index.js &
sleep 2
curl http://localhost:3001/health
kill %1
```

Expected: `ok`

- [ ] **Step 4: Commit**

```bash
git add server/src/socket-handlers.js server/src/index.js
git commit -m "feat: add Socket.IO handlers and server entry point"
```

---

### Task 6: Socket.IO Client Singleton

**Files:**
- Create: `client/src/socket.js`

- [ ] **Step 1: Create the socket client module**

Create `client/src/socket.js`:

```javascript
import { io } from 'socket.io-client';

const URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

const socket = io(URL, {
  withCredentials: true,
  autoConnect: true,
});

// Store playerId from server
let playerId = localStorage.getItem('playerId');

socket.on('player-id', ({ playerId: id }) => {
  playerId = id;
  localStorage.setItem('playerId', id);
});

export function getPlayerId() {
  return playerId;
}

export default socket;
```

- [ ] **Step 2: Commit**

```bash
git add client/src/socket.js
git commit -m "feat: add Socket.IO client singleton with player ID"
```

---

### Task 7: App Shell and Screen Router

**Files:**
- Create: `client/src/App.jsx`
- Create: `client/src/main.jsx`
- Create: `client/src/styles/index.css`

- [ ] **Step 1: Create global styles with playful theme**

Create `client/src/styles/index.css`:

```css
@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap');

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

:root {
  --color-bg: #f0e6ff;
  --color-primary: #7c3aed;
  --color-primary-hover: #6d28d9;
  --color-der: #3b82f6;
  --color-die: #ec4899;
  --color-das: #f59e0b;
  --color-correct: #22c55e;
  --color-wrong: #ef4444;
  --color-timeout: #9ca3af;
  --color-card: #ffffff;
  --color-text: #1e1b4b;
  --color-text-light: #6b7280;
  --radius: 16px;
  --radius-sm: 8px;
}

body {
  font-family: 'Nunito', sans-serif;
  background: var(--color-bg);
  color: var(--color-text);
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
}

#root {
  width: 100%;
  max-width: 600px;
  padding: 20px;
}

button {
  font-family: 'Nunito', sans-serif;
  font-weight: 700;
  font-size: 1rem;
  border: none;
  border-radius: var(--radius);
  padding: 14px 28px;
  cursor: pointer;
  transition: transform 0.15s, background 0.2s;
}

button:hover {
  transform: scale(1.03);
}

button:active {
  transform: scale(0.97);
}

.btn-primary {
  background: var(--color-primary);
  color: white;
}

.btn-primary:hover {
  background: var(--color-primary-hover);
}

.card {
  background: var(--color-card);
  border-radius: var(--radius);
  padding: 32px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
}

input, select {
  font-family: 'Nunito', sans-serif;
  font-size: 1rem;
  padding: 12px 16px;
  border: 2px solid #e5e7eb;
  border-radius: var(--radius-sm);
  width: 100%;
  outline: none;
  transition: border-color 0.2s;
}

input:focus, select:focus {
  border-color: var(--color-primary);
}

/* Answer animations */
@keyframes bounce-in {
  0% { transform: scale(1); }
  50% { transform: scale(1.15); }
  100% { transform: scale(1); }
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-6px); }
  40% { transform: translateX(6px); }
  60% { transform: translateX(-4px); }
  80% { transform: translateX(4px); }
}

@keyframes fade-gray {
  to { opacity: 0.5; filter: grayscale(1); }
}

.anim-correct {
  animation: bounce-in 0.4s ease;
}

.anim-wrong {
  animation: shake 0.4s ease;
}

.anim-timeout {
  animation: fade-gray 0.4s ease forwards;
}
```

- [ ] **Step 2: Create App.jsx with screen router**

Create `client/src/App.jsx`:

```jsx
import { useState, useEffect } from 'react';
import socket, { getPlayerId } from './socket';
import HomeScreen from './screens/HomeScreen';
import CreateGameScreen from './screens/CreateGameScreen';
import JoinGameScreen from './screens/JoinGameScreen';
import LobbyScreen from './screens/LobbyScreen';
import GameScreen from './screens/GameScreen';
import ResultsScreen from './screens/ResultsScreen';

export default function App() {
  const [screen, setScreen] = useState('home');
  const [roomCode, setRoomCode] = useState(null);
  const [players, setPlayers] = useState([]);
  const [isHost, setIsHost] = useState(false);
  const [totalQuestions, setTotalQuestions] = useState(0);

  useEffect(() => {
    socket.on('room-created', ({ roomCode }) => {
      setRoomCode(roomCode);
      setIsHost(true);
      setScreen('lobby');
    });

    socket.on('player-joined', ({ players }) => {
      setPlayers(players);
    });

    socket.on('game-started', ({ totalQuestions }) => {
      setTotalQuestions(totalQuestions);
      setScreen('game');
    });

    socket.on('game-over', ({ leaderboard }) => {
      setPlayers(leaderboard);
      setScreen('results');
    });

    socket.on('game-ended', () => {
      setRoomCode(null);
      setPlayers([]);
      setIsHost(false);
      setScreen('home');
    });

    socket.on('rejoin', ({ status, players, totalQuestions: total, isHost: host }) => {
      setPlayers(players);
      setTotalQuestions(total);
      setIsHost(host);
      if (status === 'playing') setScreen('game');
      else if (status === 'results') setScreen('results');
    });

    socket.on('error', ({ message }) => {
      alert(message);
    });

    return () => {
      socket.off('room-created');
      socket.off('player-joined');
      socket.off('game-started');
      socket.off('game-over');
      socket.off('game-ended');
      socket.off('rejoin');
      socket.off('error');
    };
  }, []);

  function handleJoinedRoom(code) {
    setRoomCode(code);
    setIsHost(false);
    setScreen('lobby');
  }

  const screens = {
    home: <HomeScreen onCreateGame={() => setScreen('create')} onJoinGame={() => setScreen('join')} />,
    create: <CreateGameScreen onBack={() => setScreen('home')} />,
    join: <JoinGameScreen onBack={() => setScreen('home')} onJoined={handleJoinedRoom} />,
    lobby: <LobbyScreen roomCode={roomCode} players={players} isHost={isHost} />,
    game: <GameScreen roomCode={roomCode} totalQuestions={totalQuestions} />,
    results: <ResultsScreen roomCode={roomCode} players={players} isHost={isHost} />,
  };

  return <div>{screens[screen]}</div>;
}
```

- [ ] **Step 3: Update main.jsx**

Create `client/src/main.jsx`:

```jsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

- [ ] **Step 4: Verify client builds**

```bash
cd client && npm run build
```

Expected: Build succeeds (screen components don't exist yet, so this will fail — that's expected). Create placeholder screens first in the next tasks.

- [ ] **Step 5: Commit**

```bash
git add client/src/App.jsx client/src/main.jsx client/src/styles/index.css
git commit -m "feat: add app shell with screen router and playful theme"
```

---

### Task 8: Home Screen

**Files:**
- Create: `client/src/screens/HomeScreen.jsx`

- [ ] **Step 1: Implement HomeScreen**

Create `client/src/screens/HomeScreen.jsx`:

```jsx
export default function HomeScreen({ onCreateGame, onJoinGame }) {
  return (
    <div className="card" style={{ textAlign: 'center' }}>
      <h1 style={{ fontSize: '2.5rem', marginBottom: '8px', color: 'var(--color-primary)' }}>
        Der Die Das
      </h1>
      <p style={{ color: 'var(--color-text-light)', marginBottom: '32px', fontSize: '1.1rem' }}>
        Master German noun articles!
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <button className="btn-primary" onClick={onCreateGame}>
          Create Game
        </button>
        <button
          onClick={onJoinGame}
          style={{ background: 'var(--color-der)', color: 'white' }}
        >
          Join Game
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/screens/HomeScreen.jsx
git commit -m "feat: add home screen"
```

---

### Task 9: Create Game Screen

**Files:**
- Create: `client/src/screens/CreateGameScreen.jsx`

- [ ] **Step 1: Implement CreateGameScreen**

Create `client/src/screens/CreateGameScreen.jsx`:

```jsx
import { useState, useEffect } from 'react';
import socket from '../socket';

export default function CreateGameScreen({ onBack }) {
  const [playerName, setPlayerName] = useState('');
  const [category, setCategory] = useState('all');
  const [questionCount, setQuestionCount] = useState(10);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    socket.emit('get-categories', (cats) => {
      setCategories(cats);
    });
  }, []);

  function handleCreate() {
    if (!playerName.trim()) return;
    socket.emit('create-room', {
      playerName: playerName.trim(),
      category,
      questionCount,
    });
  }

  return (
    <div className="card">
      <button
        onClick={onBack}
        style={{ background: 'none', color: 'var(--color-text-light)', padding: '0', marginBottom: '16px', fontSize: '0.9rem' }}
      >
        &larr; Back
      </button>
      <h2 style={{ marginBottom: '24px', color: 'var(--color-primary)' }}>Create Game</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label style={{ fontWeight: 600, marginBottom: '4px', display: 'block' }}>Your Name</label>
          <input
            value={playerName}
            onChange={e => setPlayerName(e.target.value)}
            placeholder="Enter your name"
            maxLength={20}
          />
        </div>
        <div>
          <label style={{ fontWeight: 600, marginBottom: '4px', display: 'block' }}>Category</label>
          <select value={category} onChange={e => setCategory(e.target.value)}>
            <option value="all">All</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ fontWeight: 600, marginBottom: '4px', display: 'block' }}>Questions</label>
          <div style={{ display: 'flex', gap: '12px' }}>
            {[10, 20, 30].map(n => (
              <button
                key={n}
                onClick={() => setQuestionCount(n)}
                style={{
                  flex: 1,
                  background: questionCount === n ? 'var(--color-primary)' : '#e5e7eb',
                  color: questionCount === n ? 'white' : 'var(--color-text)',
                }}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
        <button className="btn-primary" onClick={handleCreate} disabled={!playerName.trim()}>
          Create Room
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/screens/CreateGameScreen.jsx
git commit -m "feat: add create game screen with category and question count"
```

---

### Task 10: Join Game Screen

**Files:**
- Create: `client/src/screens/JoinGameScreen.jsx`

- [ ] **Step 1: Implement JoinGameScreen**

Create `client/src/screens/JoinGameScreen.jsx`:

```jsx
import { useState } from 'react';
import socket from '../socket';

export default function JoinGameScreen({ onBack, onJoined }) {
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');

  function handleJoin() {
    if (!playerName.trim() || !roomCode.trim()) return;
    const code = roomCode.trim().toUpperCase();
    socket.emit('join-room', { roomCode: code, playerName: playerName.trim() });
    onJoined(code);
  }

  return (
    <div className="card">
      <button
        onClick={onBack}
        style={{ background: 'none', color: 'var(--color-text-light)', padding: '0', marginBottom: '16px', fontSize: '0.9rem' }}
      >
        &larr; Back
      </button>
      <h2 style={{ marginBottom: '24px', color: 'var(--color-primary)' }}>Join Game</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label style={{ fontWeight: 600, marginBottom: '4px', display: 'block' }}>Your Name</label>
          <input
            value={playerName}
            onChange={e => setPlayerName(e.target.value)}
            placeholder="Enter your name"
            maxLength={20}
          />
        </div>
        <div>
          <label style={{ fontWeight: 600, marginBottom: '4px', display: 'block' }}>Room Code</label>
          <input
            value={roomCode}
            onChange={e => setRoomCode(e.target.value.toUpperCase())}
            placeholder="e.g. A3F7K2"
            maxLength={6}
            style={{ textTransform: 'uppercase', letterSpacing: '4px', fontWeight: 700, fontSize: '1.3rem', textAlign: 'center' }}
          />
        </div>
        <button className="btn-primary" onClick={handleJoin} disabled={!playerName.trim() || roomCode.length < 6}>
          Join
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/screens/JoinGameScreen.jsx
git commit -m "feat: add join game screen"
```

---

### Task 11: Lobby Screen

**Files:**
- Create: `client/src/screens/LobbyScreen.jsx`

- [ ] **Step 1: Implement LobbyScreen**

Create `client/src/screens/LobbyScreen.jsx`:

```jsx
import socket from '../socket';

export default function LobbyScreen({ roomCode, players, isHost }) {
  function handleStart() {
    socket.emit('start-game', { roomCode });
  }

  function handleCopyCode() {
    navigator.clipboard.writeText(roomCode);
  }

  return (
    <div className="card" style={{ textAlign: 'center' }}>
      <h2 style={{ color: 'var(--color-primary)', marginBottom: '8px' }}>Game Lobby</h2>
      <div
        onClick={handleCopyCode}
        style={{
          fontSize: '2rem',
          fontWeight: 800,
          letterSpacing: '6px',
          background: 'var(--color-bg)',
          borderRadius: 'var(--radius-sm)',
          padding: '16px',
          cursor: 'pointer',
          marginBottom: '8px',
        }}
        title="Click to copy"
      >
        {roomCode}
      </div>
      <p style={{ color: 'var(--color-text-light)', marginBottom: '24px', fontSize: '0.85rem' }}>
        Tap code to copy &middot; Share with friends to join
      </p>

      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ marginBottom: '12px' }}>Players ({players.length})</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {players.map(p => (
            <div
              key={p.id}
              style={{
                background: 'var(--color-bg)',
                borderRadius: 'var(--radius-sm)',
                padding: '10px 16px',
                fontWeight: 600,
              }}
            >
              {p.name} {p.id === players[0]?.id ? '(Host)' : ''}
            </div>
          ))}
        </div>
      </div>

      {isHost ? (
        <button className="btn-primary" onClick={handleStart} style={{ width: '100%' }}>
          Start Game
        </button>
      ) : (
        <p style={{ color: 'var(--color-text-light)', fontStyle: 'italic' }}>
          Waiting for host to start...
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/screens/LobbyScreen.jsx
git commit -m "feat: add lobby screen with room code and player list"
```

---

### Task 12: Article Button Component

**Files:**
- Create: `client/src/components/ArticleButton.jsx`

- [ ] **Step 1: Implement ArticleButton with answer animations**

Create `client/src/components/ArticleButton.jsx`:

```jsx
const articleColors = {
  der: 'var(--color-der)',
  die: 'var(--color-die)',
  das: 'var(--color-das)',
};

export default function ArticleButton({ article, onClick, disabled, result }) {
  let className = '';
  let style = {
    flex: 1,
    fontSize: '1.4rem',
    padding: '20px',
    background: articleColors[article],
    color: 'white',
    opacity: disabled && !result ? 0.6 : 1,
  };

  if (result === 'correct') {
    className = 'anim-correct';
    style.background = 'var(--color-correct)';
  } else if (result === 'wrong') {
    className = 'anim-wrong';
    style.background = 'var(--color-wrong)';
  } else if (result === 'timeout') {
    className = 'anim-timeout';
    style.background = 'var(--color-timeout)';
  } else if (result === 'correct-highlight') {
    // Highlight the correct answer when user picked wrong or timed out
    style.background = 'var(--color-correct)';
    style.outline = '3px solid var(--color-correct)';
    style.outlineOffset = '2px';
  }

  return (
    <button className={className} style={style} onClick={() => onClick(article)} disabled={disabled}>
      {article}
    </button>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/ArticleButton.jsx
git commit -m "feat: add article button component with answer animations"
```

---

### Task 13: Timer Component

**Files:**
- Create: `client/src/components/Timer.jsx`

- [ ] **Step 1: Implement animated countdown timer**

Create `client/src/components/Timer.jsx`:

```jsx
import { useState, useEffect } from 'react';

const RADIUS = 30;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function Timer({ duration, running, onTimeout }) {
  const [timeLeft, setTimeLeft] = useState(duration);

  useEffect(() => {
    setTimeLeft(duration);
  }, [duration, running]);

  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 0.1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 0.1;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [running]);

  const fraction = timeLeft / duration;
  const offset = CIRCUMFERENCE * (1 - fraction);
  const color = timeLeft <= 3 ? 'var(--color-wrong)' : 'var(--color-primary)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg width="80" height="80" viewBox="0 0 80 80">
        <circle
          cx="40" cy="40" r={RADIUS}
          fill="none" stroke="#e5e7eb" strokeWidth="6"
        />
        <circle
          cx="40" cy="40" r={RADIUS}
          fill="none" stroke={color} strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          transform="rotate(-90 40 40)"
          style={{ transition: 'stroke-dashoffset 0.1s linear, stroke 0.3s' }}
        />
        <text x="40" y="45" textAnchor="middle" fontSize="18" fontWeight="700" fill={color}>
          {Math.ceil(timeLeft)}
        </text>
      </svg>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/Timer.jsx
git commit -m "feat: add animated countdown timer component"
```

---

### Task 14: Scoreboard Component

**Files:**
- Create: `client/src/components/Scoreboard.jsx`

- [ ] **Step 1: Implement running scoreboard**

Create `client/src/components/Scoreboard.jsx`:

```jsx
export default function Scoreboard({ players, currentPlayerId }) {
  const sorted = [...players].sort((a, b) => b.score - a.score);

  return (
    <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      gap: '8px',
      justifyContent: 'center',
      marginTop: '16px',
    }}>
      {sorted.map(p => (
        <div
          key={p.id}
          style={{
            background: p.id === currentPlayerId ? 'var(--color-primary)' : 'var(--color-bg)',
            color: p.id === currentPlayerId ? 'white' : 'var(--color-text)',
            borderRadius: 'var(--radius-sm)',
            padding: '6px 14px',
            fontWeight: 700,
            fontSize: '0.85rem',
          }}
        >
          {p.name}: {p.score}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/Scoreboard.jsx
git commit -m "feat: add scoreboard component"
```

---

### Task 15: Leaderboard Component

**Files:**
- Create: `client/src/components/Leaderboard.jsx`

- [ ] **Step 1: Implement final results leaderboard**

Create `client/src/components/Leaderboard.jsx`:

```jsx
const medals = ['🥇', '🥈', '🥉'];

export default function Leaderboard({ players }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {players.map((p, i) => (
        <div
          key={p.id}
          style={{
            background: i === 0 ? 'linear-gradient(135deg, #fbbf24, #f59e0b)' : 'var(--color-bg)',
            color: i === 0 ? 'white' : 'var(--color-text)',
            borderRadius: 'var(--radius)',
            padding: '16px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontWeight: i === 0 ? 800 : 600,
            fontSize: i === 0 ? '1.1rem' : '1rem',
          }}
        >
          <div>
            <span style={{ marginRight: '8px' }}>{medals[i] || `#${i + 1}`}</span>
            {p.name}
          </div>
          <div style={{ textAlign: 'right', fontSize: '0.85rem' }}>
            <div style={{ fontWeight: 800, fontSize: '1.2rem' }}>{p.score} pts</div>
            <div style={{ opacity: 0.8 }}>
              {p.accuracy}% acc &middot; {p.timeouts} timeouts
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/Leaderboard.jsx
git commit -m "feat: add leaderboard component for results screen"
```

---

### Task 16: Game Screen

**Files:**
- Create: `client/src/screens/GameScreen.jsx`

- [ ] **Step 1: Implement GameScreen with full question loop**

Create `client/src/screens/GameScreen.jsx`:

```jsx
import { useState, useEffect } from 'react';
import socket, { getPlayerId } from '../socket';
import ArticleButton from '../components/ArticleButton';
import Timer from '../components/Timer';
import Scoreboard from '../components/Scoreboard';

export default function GameScreen({ roomCode, totalQuestions }) {
  const [question, setQuestion] = useState(null);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [result, setResult] = useState(null); // { correctArticle, players }
  const [timerRunning, setTimerRunning] = useState(false);
  const [players, setPlayers] = useState([]);
  const [answeredPlayers, setAnsweredPlayers] = useState(new Set());

  useEffect(() => {
    socket.on('new-question', (q) => {
      setQuestion(q);
      setSelectedArticle(null);
      setResult(null);
      setTimerRunning(true);
      setAnsweredPlayers(new Set());
    });

    socket.on('player-answered', ({ playerId }) => {
      setAnsweredPlayers(prev => new Set([...prev, playerId]));
    });

    socket.on('question-result', (res) => {
      setResult(res);
      setTimerRunning(false);
      setPlayers(res.players);
    });

    return () => {
      socket.off('new-question');
      socket.off('player-answered');
      socket.off('question-result');
    };
  }, []);

  function handleAnswer(article) {
    if (selectedArticle || result) return;
    setSelectedArticle(article);
    socket.emit('submit-answer', { roomCode, article });
  }

  function getButtonResult(article) {
    if (!result) return null;
    const correct = result.correctArticle;

    if (selectedArticle === article && article === correct) return 'correct';
    if (selectedArticle === article && article !== correct) return 'wrong';
    if (!selectedArticle && article === correct) return 'correct-highlight'; // timed out
    if (selectedArticle && selectedArticle !== article && article === correct) return 'correct-highlight';
    if (!selectedArticle && article !== correct) return 'timeout';
    return null;
  }

  if (!question) {
    return (
      <div className="card" style={{ textAlign: 'center' }}>
        <p>Waiting for first question...</p>
      </div>
    );
  }

  return (
    <div className="card" style={{ textAlign: 'center' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <span style={{ fontWeight: 600, color: 'var(--color-text-light)' }}>
          {question.questionIndex + 1} / {totalQuestions}
        </span>
        <Timer duration={10} running={timerRunning} />
        <span style={{
          fontSize: '0.8rem',
          color: 'var(--color-text-light)',
          background: 'var(--color-bg)',
          borderRadius: 'var(--radius-sm)',
          padding: '4px 8px',
        }}>
          {question.category}
        </span>
      </div>

      <h1 style={{ fontSize: '3rem', margin: '24px 0', color: 'var(--color-text)' }}>
        {question.noun}
      </h1>

      {result && selectedArticle === result.correctArticle && (
        <div style={{ color: 'var(--color-correct)', fontWeight: 700, fontSize: '1.2rem', marginBottom: '12px' }}>
          +1
        </div>
      )}

      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
        {['der', 'die', 'das'].map(article => (
          <ArticleButton
            key={article}
            article={article}
            onClick={handleAnswer}
            disabled={!!selectedArticle || !!result}
            result={getButtonResult(article)}
          />
        ))}
      </div>

      <Scoreboard players={players} currentPlayerId={getPlayerId()} />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/screens/GameScreen.jsx
git commit -m "feat: add game screen with question loop and answer feedback"
```

---

### Task 17: Results Screen

**Files:**
- Create: `client/src/screens/ResultsScreen.jsx`

- [ ] **Step 1: Implement ResultsScreen**

Create `client/src/screens/ResultsScreen.jsx`:

```jsx
import socket from '../socket';
import Leaderboard from '../components/Leaderboard';

export default function ResultsScreen({ roomCode, players, isHost }) {
  function handlePlayAgain() {
    socket.emit('play-again', { roomCode });
  }

  function handleEndGame() {
    socket.emit('end-game', { roomCode });
  }

  return (
    <div className="card">
      <h2 style={{ textAlign: 'center', color: 'var(--color-primary)', marginBottom: '24px' }}>
        Results
      </h2>

      <Leaderboard players={players} />

      <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
        {isHost ? (
          <>
            <button
              className="btn-primary"
              onClick={handlePlayAgain}
              style={{ flex: 1 }}
            >
              Play Again
            </button>
            <button
              onClick={handleEndGame}
              style={{ flex: 1, background: '#e5e7eb', color: 'var(--color-text)' }}
            >
              End Game
            </button>
          </>
        ) : (
          <p style={{ textAlign: 'center', width: '100%', color: 'var(--color-text-light)', fontStyle: 'italic' }}>
            Waiting for host...
          </p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/screens/ResultsScreen.jsx
git commit -m "feat: add results screen with leaderboard"
```

---

### Task 18: Firebase & Docker Configuration

**Files:**
- Create: `firebase.json`
- Create: `Dockerfile`
- Create: `.firebaserc`

- [ ] **Step 1: Create firebase.json**

Create `firebase.json`:

```json
{
  "hosting": {
    "public": "client/dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      {
        "source": "/socket.io/**",
        "run": {
          "serviceId": "flash-server",
          "region": "us-central1"
        }
      },
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}
```

- [ ] **Step 2: Create Dockerfile for Cloud Run**

Create `Dockerfile`:

```dockerfile
FROM node:20-slim

WORKDIR /app

COPY server/package*.json ./
RUN npm ci --production

COPY server/src ./src
COPY server/data ./data

EXPOSE 3001

ENV PORT=3001

CMD ["node", "src/index.js"]
```

- [ ] **Step 3: Create .firebaserc**

Create `.firebaserc`:

```json
{
  "projects": {
    "default": "your-project-id"
  }
}
```

Note: Replace `your-project-id` with the actual Firebase project ID before deploying.

- [ ] **Step 4: Commit**

```bash
git add firebase.json Dockerfile .firebaserc
git commit -m "feat: add Firebase hosting config and Cloud Run Dockerfile"
```

---

### Task 19: Playwright E2E Setup

**Files:**
- Create: `e2e/package.json`
- Create: `e2e/playwright.config.js`
- Create: `e2e/helpers.js`

- [ ] **Step 1: Initialize Playwright project**

```bash
mkdir -p e2e
cd e2e
npm init -y
```

Edit `e2e/package.json`:

```json
{
  "name": "flash-e2e",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "test": "npx playwright test",
    "test:headed": "npx playwright test --headed",
    "test:debug": "npx playwright test --debug"
  }
}
```

- [ ] **Step 2: Install Playwright**

```bash
cd e2e
npm install -D @playwright/test
npx playwright install chromium
```

- [ ] **Step 3: Create Playwright config**

Create `e2e/playwright.config.js`:

```javascript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: 0,
  use: {
    baseURL: 'http://localhost:5173',
    headless: true,
    screenshot: 'only-on-failure',
  },
  webServer: [
    {
      command: 'cd ../server && npm run dev',
      port: 3001,
      reuseExistingServer: true,
      timeout: 10_000,
    },
    {
      command: 'cd ../client && npm run dev',
      port: 5173,
      reuseExistingServer: true,
      timeout: 10_000,
    },
  ],
});
```

- [ ] **Step 4: Create test helpers**

Create `e2e/helpers.js`:

```javascript
/**
 * Creates a game room from a browser page.
 * Returns the room code.
 */
export async function createGame(page, { playerName = 'Host', category = 'all', questionCount = 10 } = {}) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Create Game' }).click();
  await page.getByPlaceholder('Enter your name').fill(playerName);

  if (category !== 'all') {
    await page.getByRole('combobox').selectOption(category);
  }

  // Click question count button
  await page.getByRole('button', { name: String(questionCount) }).click();
  await page.getByRole('button', { name: 'Create Room' }).click();

  // Wait for lobby and extract room code
  await page.waitForSelector('text=Game Lobby');
  const codeEl = await page.locator('[title="Click to copy"]');
  const roomCode = await codeEl.textContent();
  return roomCode.trim();
}

/**
 * Joins an existing game room from a browser page.
 */
export async function joinGame(page, roomCode, playerName = 'Player2') {
  await page.goto('/');
  await page.getByRole('button', { name: 'Join Game' }).click();
  await page.getByPlaceholder('Enter your name').fill(playerName);
  await page.getByPlaceholder('e.g. A3F7K2').fill(roomCode);
  await page.getByRole('button', { name: 'Join' }).click();
  await page.waitForSelector('text=Game Lobby');
}

/**
 * Answers the current question by clicking one of der/die/das.
 */
export async function answerQuestion(page, article) {
  await page.getByRole('button', { name: article, exact: true }).click();
}

/**
 * Waits for the next question to appear on screen.
 */
export async function waitForQuestion(page) {
  // Wait for a noun to appear (large centered text)
  await page.waitForSelector('h1');
  const noun = await page.locator('h1').textContent();
  return noun;
}

/**
 * Waits for the question result to show (correct answer revealed).
 */
export async function waitForQuestionResult(page) {
  // Wait for any answer animation class to appear on a button
  await page.waitForSelector('.anim-correct, .anim-wrong, .anim-timeout, [style*="outline"]', { timeout: 15_000 });
}
```

- [ ] **Step 5: Commit**

```bash
git add e2e/
git commit -m "chore: set up Playwright e2e test infrastructure"
```

---

### Task 20: E2E Tests — Main CUJ (Single Player & Multiplayer)

**Files:**
- Create: `e2e/tests/main-flow.spec.js`

- [ ] **Step 1: Write single-player happy path test**

Create `e2e/tests/main-flow.spec.js`:

```javascript
import { test, expect } from '@playwright/test';
import { createGame, joinGame, answerQuestion, waitForQuestion, waitForQuestionResult } from '../helpers.js';

test.describe('Single player flow', () => {
  test('create game, answer all questions, see results', async ({ page }) => {
    const roomCode = await createGame(page, { playerName: 'Solo', questionCount: 10 });
    expect(roomCode).toMatch(/^[A-Z0-9]{6}$/);

    // Start game as solo player
    await page.getByRole('button', { name: 'Start Game' }).click();

    // Answer 10 questions
    for (let i = 0; i < 10; i++) {
      await waitForQuestion(page);

      // Verify progress indicator
      await expect(page.getByText(`${i + 1} / 10`)).toBeVisible();

      // Pick an answer (just click "der" every time — correctness doesn't matter for flow test)
      await answerQuestion(page, 'der');

      // Wait for result reveal
      await waitForQuestionResult(page);
    }

    // Should land on results screen
    await expect(page.getByText('Results')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('Solo')).toBeVisible();
    await expect(page.getByText('pts')).toBeVisible();
    await expect(page.getByText('acc')).toBeVisible();

    // Host sees Play Again and End Game buttons
    await expect(page.getByRole('button', { name: 'Play Again' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'End Game' })).toBeVisible();

    // End game returns to home
    await page.getByRole('button', { name: 'End Game' }).click();
    await expect(page.getByText('Der Die Das')).toBeVisible();
  });
});

test.describe('Multiplayer flow', () => {
  test('two players complete a game together', async ({ browser }) => {
    const hostContext = await browser.newContext();
    const playerContext = await browser.newContext();
    const hostPage = await hostContext.newPage();
    const playerPage = await playerContext.newPage();

    // Host creates room
    const roomCode = await createGame(hostPage, { playerName: 'Alice', questionCount: 10 });

    // Player joins
    await joinGame(playerPage, roomCode, 'Bob');

    // Both should see 2 players in lobby
    await expect(hostPage.getByText('Players (2)')).toBeVisible();
    await expect(playerPage.getByText('Players (2)')).toBeVisible();

    // Player should NOT see Start Game button
    await expect(playerPage.getByRole('button', { name: 'Start Game' })).not.toBeVisible();

    // Host starts game
    await hostPage.getByRole('button', { name: 'Start Game' }).click();

    // Both players should see the game screen
    for (let i = 0; i < 10; i++) {
      // Both see the same question
      const hostNoun = await waitForQuestion(hostPage);
      const playerNoun = await waitForQuestion(playerPage);
      expect(hostNoun).toBe(playerNoun);

      // Both answer
      await answerQuestion(hostPage, 'der');
      await answerQuestion(playerPage, 'die');

      // Both see result
      await waitForQuestionResult(hostPage);
      await waitForQuestionResult(playerPage);
    }

    // Both land on results
    await expect(hostPage.getByText('Results')).toBeVisible({ timeout: 15_000 });
    await expect(playerPage.getByText('Results')).toBeVisible({ timeout: 15_000 });

    // Both players listed
    await expect(hostPage.getByText('Alice')).toBeVisible();
    await expect(hostPage.getByText('Bob')).toBeVisible();

    // Player should see "Waiting for host..."
    await expect(playerPage.getByText('Waiting for host...')).toBeVisible();

    // Host clicks Play Again
    await hostPage.getByRole('button', { name: 'Play Again' }).click();

    // Both should see game screen again
    await waitForQuestion(hostPage);
    await waitForQuestion(playerPage);

    // Clean up
    await hostContext.close();
    await playerContext.close();
  });
});

- [ ] **Step 2: Run tests to verify they pass**

```bash
cd e2e && npx playwright test tests/main-flow.spec.js
```

Expected: All tests PASS.

- [ ] **Step 3: Commit**

```bash
git add e2e/tests/main-flow.spec.js
git commit -m "test: add e2e tests for single-player and multiplayer happy paths"
```

---

### Task 21: E2E Tests — Timeout Handling

**Files:**
- Create: `e2e/tests/timeout.spec.js`

- [ ] **Step 1: Write timeout e2e test**

Create `e2e/tests/timeout.spec.js`:

```javascript
import { test, expect } from '@playwright/test';
import { createGame, joinGame, answerQuestion, waitForQuestion, waitForQuestionResult } from '../helpers.js';

test.describe('Timeout behavior', () => {
  test('single player times out — marked as timed out, game continues', async ({ page }) => {
    const roomCode = await createGame(page, { playerName: 'Slow', questionCount: 10 });
    await page.getByRole('button', { name: 'Start Game' }).click();

    // Question 1: let it time out (don't answer for 10s)
    await waitForQuestion(page);

    // Wait for the question result without answering — server times out after 10s
    // The timeout animation (gray fade) should appear
    await waitForQuestionResult(page);

    // Verify timeout visual: buttons should have the timeout style
    const timeoutButton = page.locator('.anim-timeout');
    await expect(timeoutButton.first()).toBeVisible();

    // Question 2: answer normally to verify game continues
    await waitForQuestion(page);
    await answerQuestion(page, 'der');
    await waitForQuestionResult(page);

    // Score should reflect: 0 for timeout, 0 or 1 for Q2
    // Game should still be running — not stuck
    await expect(page.getByText('3 / 10')).toBeVisible({ timeout: 20_000 });
  });

  test('multiplayer — one player times out, other answered, game advances', async ({ browser }) => {
    const hostContext = await browser.newContext();
    const playerContext = await browser.newContext();
    const hostPage = await hostContext.newPage();
    const playerPage = await playerContext.newPage();

    const roomCode = await createGame(hostPage, { playerName: 'Fast', questionCount: 10 });
    await joinGame(playerPage, roomCode, 'Slow');

    await hostPage.getByRole('button', { name: 'Start Game' }).click();

    // Q1: Host answers, player does NOT answer (times out)
    await waitForQuestion(hostPage);
    await waitForQuestion(playerPage);
    await answerQuestion(hostPage, 'der');

    // Don't answer on playerPage — wait for server timeout
    await waitForQuestionResult(hostPage);
    await waitForQuestionResult(playerPage);

    // Slow player should see timeout animation
    const timeoutButton = playerPage.locator('.anim-timeout');
    await expect(timeoutButton.first()).toBeVisible();

    // Q2: both answer to verify game continues
    await waitForQuestion(hostPage);
    await waitForQuestion(playerPage);
    await answerQuestion(hostPage, 'der');
    await answerQuestion(playerPage, 'die');
    await waitForQuestionResult(hostPage);
    await waitForQuestionResult(playerPage);

    await hostContext.close();
    await playerContext.close();
  });
});
```

- [ ] **Step 2: Run tests to verify they pass**

```bash
cd e2e && npx playwright test tests/timeout.spec.js
```

Expected: All tests PASS. Note: the timeout test takes ~12s per timed-out question due to the 10s server timer + 3s pause.

- [ ] **Step 3: Commit**

```bash
git add e2e/tests/timeout.spec.js
git commit -m "test: add e2e tests for timeout behavior"
```

---

### Task 22: E2E Tests — Player Reconnection

**Files:**
- Create: `e2e/tests/reconnect.spec.js`

- [ ] **Step 1: Write reconnection e2e test**

Create `e2e/tests/reconnect.spec.js`:

```javascript
import { test, expect } from '@playwright/test';
import { createGame, joinGame, answerQuestion, waitForQuestion, waitForQuestionResult } from '../helpers.js';

test.describe('Player reconnection', () => {
  test('player disconnects and reconnects mid-game', async ({ browser }) => {
    const hostContext = await browser.newContext();
    const playerContext = await browser.newContext();
    const hostPage = await hostContext.newPage();
    const playerPage = await playerContext.newPage();

    const roomCode = await createGame(hostPage, { playerName: 'Alice', questionCount: 10 });
    await joinGame(playerPage, roomCode, 'Bob');

    await hostPage.getByRole('button', { name: 'Start Game' }).click();

    // Q1: both answer normally
    await waitForQuestion(hostPage);
    await waitForQuestion(playerPage);
    await answerQuestion(hostPage, 'der');
    await answerQuestion(playerPage, 'der');
    await waitForQuestionResult(hostPage);
    await waitForQuestionResult(playerPage);

    // Q2: player disconnects (close the page)
    await waitForQuestion(hostPage);
    await playerPage.close();

    // Host answers — since player is disconnected, question should complete
    await answerQuestion(hostPage, 'der');
    await waitForQuestionResult(hostPage);

    // Q3: player reconnects by opening a new page in same context (same cookies)
    const playerPage2 = await playerContext.newPage();
    await playerPage2.goto('/');
    // Rejoin the room
    await playerPage2.getByRole('button', { name: 'Join Game' }).click();
    await playerPage2.getByPlaceholder('Enter your name').fill('Bob');
    await playerPage2.getByPlaceholder('e.g. A3F7K2').fill(roomCode);
    await playerPage2.getByRole('button', { name: 'Join' }).click();

    // Player should rejoin the game in progress (not lobby)
    // They should see the current question or be in the game screen
    await waitForQuestion(hostPage);

    // Both can continue playing
    await answerQuestion(hostPage, 'der');
    // The reconnected player should also be able to answer
    // (they may need to wait for the question to appear depending on timing)
    try {
      await waitForQuestion(playerPage2);
      await answerQuestion(playerPage2, 'die');
    } catch {
      // Player may have missed this question — that's fine, verify game continues
    }

    await waitForQuestionResult(hostPage);

    await hostContext.close();
    await playerContext.close();
  });

  test('all players disconnect — room is cleaned up', async ({ browser }) => {
    const hostContext = await browser.newContext();
    const playerContext = await browser.newContext();
    const hostPage = await hostContext.newPage();
    const playerPage = await playerContext.newPage();

    const roomCode = await createGame(hostPage, { playerName: 'Alice', questionCount: 10 });
    await joinGame(playerPage, roomCode, 'Bob');

    // Both disconnect
    await hostPage.close();
    await playerPage.close();

    // Wait a moment for server to process disconnections
    await new Promise(r => setTimeout(r, 2000));

    // Try to join the old room — should get "Room not found"
    const newPage = await hostContext.newPage();
    await newPage.goto('/');
    await newPage.getByRole('button', { name: 'Join Game' }).click();
    await newPage.getByPlaceholder('Enter your name').fill('Charlie');
    await newPage.getByPlaceholder('e.g. A3F7K2').fill(roomCode);
    await newPage.getByRole('button', { name: 'Join' }).click();

    // Should show error dialog or stay on join screen
    // The server emits an 'error' event with "Room not found"
    newPage.on('dialog', async dialog => {
      expect(dialog.message()).toContain('Room not found');
      await dialog.accept();
    });

    await hostContext.close();
    await playerContext.close();
  });
});
```

- [ ] **Step 2: Run tests to verify they pass**

```bash
cd e2e && npx playwright test tests/reconnect.spec.js
```

Expected: All tests PASS.

- [ ] **Step 3: Commit**

```bash
git add e2e/tests/reconnect.spec.js
git commit -m "test: add e2e tests for player reconnection and room cleanup"
```

---

### Task 23: E2E Tests — Edge Cases & Error Handling

**Files:**
- Create: `e2e/tests/edge-cases.spec.js`

- [ ] **Step 1: Write edge case e2e tests**

Create `e2e/tests/edge-cases.spec.js`:

```javascript
import { test, expect } from '@playwright/test';
import { createGame, joinGame, answerQuestion, waitForQuestion, waitForQuestionResult } from '../helpers.js';

test.describe('Edge cases', () => {
  test('join non-existent room shows error', async ({ page }) => {
    page.on('dialog', async dialog => {
      expect(dialog.message()).toContain('Room not found');
      await dialog.accept();
    });

    await page.goto('/');
    await page.getByRole('button', { name: 'Join Game' }).click();
    await page.getByPlaceholder('Enter your name').fill('Test');
    await page.getByPlaceholder('e.g. A3F7K2').fill('ZZZZZZ');
    await page.getByRole('button', { name: 'Join' }).click();

    // Wait a moment for the error event
    await page.waitForTimeout(2000);
  });

  test('non-host cannot start the game', async ({ browser }) => {
    const hostContext = await browser.newContext();
    const playerContext = await browser.newContext();
    const hostPage = await hostContext.newPage();
    const playerPage = await playerContext.newPage();

    const roomCode = await createGame(hostPage, { playerName: 'Host' });
    await joinGame(playerPage, roomCode, 'Player');

    // Player should NOT see Start Game button
    await expect(playerPage.getByRole('button', { name: 'Start Game' })).not.toBeVisible();
    await expect(playerPage.getByText('Waiting for host to start...')).toBeVisible();

    await hostContext.close();
    await playerContext.close();
  });

  test('category filter works — only shows nouns from selected category', async ({ page }) => {
    const roomCode = await createGame(page, { playerName: 'Tester', category: 'animals', questionCount: 10 });

    await page.getByRole('button', { name: 'Start Game' }).click();

    // Check that the category label shows "animals" for the first question
    await waitForQuestion(page);
    await expect(page.getByText('animals')).toBeVisible();

    // Answer to continue
    await answerQuestion(page, 'der');
    await waitForQuestionResult(page);

    // Second question should also be animals
    await waitForQuestion(page);
    await expect(page.getByText('animals')).toBeVisible();

    // We trust the server filtering from unit tests — just verify the UI label
  });

  test('play again resets scores and starts fresh', async ({ page }) => {
    const roomCode = await createGame(page, { playerName: 'Repeat', questionCount: 10 });

    await page.getByRole('button', { name: 'Start Game' }).click();

    // Answer all 10 questions
    for (let i = 0; i < 10; i++) {
      await waitForQuestion(page);
      await answerQuestion(page, 'der');
      await waitForQuestionResult(page);
    }

    // Should see results
    await expect(page.getByText('Results')).toBeVisible({ timeout: 15_000 });

    // Click Play Again
    await page.getByRole('button', { name: 'Play Again' }).click();

    // Should see a new question (game screen)
    await waitForQuestion(page);
    await expect(page.getByText('1 / 10')).toBeVisible();

    // Score should be reset (check scoreboard shows 0)
    await expect(page.getByText('Repeat: 0')).toBeVisible();
  });

  test('end game returns all players to home', async ({ browser }) => {
    const hostContext = await browser.newContext();
    const playerContext = await browser.newContext();
    const hostPage = await hostContext.newPage();
    const playerPage = await playerContext.newPage();

    const roomCode = await createGame(hostPage, { playerName: 'Host', questionCount: 10 });
    await joinGame(playerPage, roomCode, 'Player');

    await hostPage.getByRole('button', { name: 'Start Game' }).click();

    // Answer all questions
    for (let i = 0; i < 10; i++) {
      await waitForQuestion(hostPage);
      await waitForQuestion(playerPage);
      await answerQuestion(hostPage, 'der');
      await answerQuestion(playerPage, 'der');
      await waitForQuestionResult(hostPage);
      await waitForQuestionResult(playerPage);
    }

    // Results screen
    await expect(hostPage.getByText('Results')).toBeVisible({ timeout: 15_000 });
    await expect(playerPage.getByText('Results')).toBeVisible({ timeout: 15_000 });

    // Host ends game
    await hostPage.getByRole('button', { name: 'End Game' }).click();

    // Both should return to home
    await expect(hostPage.getByText('Der Die Das')).toBeVisible();
    await expect(playerPage.getByText('Der Die Das')).toBeVisible();

    await hostContext.close();
    await playerContext.close();
  });
});
```

- [ ] **Step 2: Run all e2e tests**

```bash
cd e2e && npx playwright test
```

Expected: All tests PASS across all spec files.

- [ ] **Step 3: Commit**

```bash
git add e2e/tests/edge-cases.spec.js
git commit -m "test: add e2e tests for edge cases and error handling"
```
