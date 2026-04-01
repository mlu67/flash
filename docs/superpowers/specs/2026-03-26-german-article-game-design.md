# German Article Game — Design Spec

A multiplayer web-based quiz game to help players memorize German noun articles (der, die, das).

## Architecture

Three-tier setup with in-memory game state (Approach A):

1. **React SPA** (Firebase Hosting) — all UI, game screens, Socket.IO client
2. **Node.js + Socket.IO server** (Cloud Run, `--max-instances=1`) — game logic, room management, in-memory state
3. **Firebase Hosting proxy** — rewrites `/socket.io/**` to Cloud Run (single domain, no CORS)

Word lists are stored as a local JSON file on the server. No database in v1.

### Data Flow

- On server start, word list is loaded from local JSON into memory.
- Host creates a room; server generates a 6-character room code.
- Players join via code; Socket.IO connection established.
- During gameplay, all state lives in server memory — answers, scores, timers.
- Single-player mode uses the same game loop with one player — no special code path.

## Data Models

### Word Entry (local JSON)

```json
{
  "noun": "Hund",
  "article": "der",
  "category": "animals"
}
```

### Word List File Structure

```json
{
  "categories": [
    { "id": "animals", "label": "Animals" }
  ],
  "words": [
    { "noun": "Hund", "article": "der", "category": "animals" }
  ]
}
```

### Room (in-memory)

```
{
  roomCode: "A3F7K2",
  hostId: string,              // player UUID from cookie
  settings: {
    category: "all" | string,  // category ID or "all"
    questionCount: number       // 10, 20, or 30
  },
  players: [{
    id: string,                // UUID from cookie
    name: string,
    score: number,
    connected: boolean,
    answers: [{
      noun: string,
      selected: string | null, // null if timed out
      correct: boolean,
      timedOut: boolean
    }]
  }],
  status: "lobby" | "playing" | "results",
  currentQuestionIndex: number,
  questions: [{ noun, article, category }],  // shuffled subset
  playersAnswered: Set<playerId>
}
```

## Socket.IO Events

### Client to Server

| Event | Payload | When |
|---|---|---|
| `create-room` | `{ playerName, category, questionCount }` | Host creates a game |
| `join-room` | `{ roomCode, playerName }` | Player joins via code |
| `start-game` | `{ roomCode }` | Host starts the round |
| `submit-answer` | `{ roomCode, article }` | Player picks der/die/das |
| `play-again` | `{ roomCode }` | Host starts another round |
| `end-game` | `{ roomCode }` | Host ends and returns to lobby |

### Server to Client

| Event | Payload | When |
|---|---|---|
| `room-created` | `{ roomCode }` | Confirms room creation |
| `player-joined` | `{ players }` | Updated player list |
| `game-started` | `{ totalQuestions }` | Game begins |
| `new-question` | `{ questionIndex, noun, category }` | Next question (no article sent) |
| `player-answered` | `{ playerId, playerName }` | Someone answered (no reveal of correctness) |
| `question-result` | `{ correctArticle, players[] with updated scores }` | All answered or timeout — reveals answer |
| `game-over` | `{ leaderboard, playerStats[] }` | Final results |
| `error` | `{ message }` | Invalid action |

## Game Logic

### Room Creation

- Server generates a random 6-character uppercase alphanumeric code, checked for uniqueness against active rooms.
- Questions are selected when the host starts the game: filter word list by category (if not "all"), shuffle, take the first N.

### Question Loop

1. Server sends `new-question` to all players.
2. Server starts a 10-second timer.
3. As each player submits, server validates (correct/wrong), stores the answer, emits `player-answered` to all.
4. When all connected players have answered OR the 10s timer fires (whichever first):
   - Any player who hasn't answered is marked as timed out.
   - Server emits `question-result` with correct article + updated scores for all players.
5. Server waits 3 seconds (for players to see the result), then sends next `new-question` or `game-over` if last question.

### Scoring

- Correct answer: **+1 point**
- Wrong answer: **0 points**
- Timed out: **0 points**

No speed bonus, no streaks, no penalties.

### Player Identity & Reconnection

- On first visit, server sets an HTTP-only cookie with a UUID as the player ID.
- This UUID identifies the player across reconnections (not the Socket.IO connection ID).
- If a player disconnects mid-game:
  - Their slot stays in the game; they are not removed.
  - The game continues normally — timer keeps ticking, other players' answers still trigger progression.
  - If they don't reconnect before the timer expires, they're marked as timed out for that question.
  - If they reconnect (same cookie), they rejoin the same room on whatever question is current.
- The host is treated the same as any other player for disconnection — the game does not pause or end.

### Room Cleanup

- Rooms are removed from memory when the host ends the game or all players disconnect.
- Stale rooms (no activity for 30 minutes) are cleaned up by a periodic sweep.

## UI Screens

6 screens, playful/colorful visual style (bright colors, rounded shapes, game-like feel).

### 1. Home Screen

- Game title/logo with playful styling.
- Two buttons: **"Create Game"** and **"Join Game"**.

### 2. Create Game (Host)

- Player name input.
- Category dropdown (default: "All", populated from word list categories).
- Question count selector (10 / 20 / 30).
- "Create Room" button — transitions to Lobby.

### 3. Join Game

- Player name input.
- Room code input.
- "Join" button — transitions to Lobby.

### 4. Lobby

- Room code displayed prominently (easy to copy/share).
- List of joined players.
- Host sees a **"Start Game"** button (enabled even with 1 player for solo mode).
- Non-host players see "Waiting for host to start..."

### 5. Game Screen

- Current noun displayed large and centered.
- Three colorful buttons: **der** / **die** / **das**.
- 10-second countdown timer (animated ring or bar).
- Progress indicator: "Question 3 / 10".
- Running scoreboard sidebar/footer showing all players' scores.
- After `question-result`:
  - Correct answer highlighted.
  - **Correct:** button flashes green, celebratory bounce/pop animation, small "+1" score indicator.
  - **Wrong:** button flashes red, subtle shake animation.
  - **Timed out:** grayed out with clock icon, gentle fade effect.
  - 3-second pause before next question.

### 6. Results Screen

- Leaderboard ranked by score.
- Per-player stats: accuracy %, correct/total, number of timeouts.
- Host sees two buttons: **"Play Again"** / **"End Game"**.
- Non-host sees "Waiting for host..."
- "Play Again" returns to a fresh game with the same room and players.
- "End Game" returns everyone to the Home screen.

### Navigation Flow

```
Home -> Create/Join -> Lobby -> Game -> Results -> (Play Again -> Game) or (End -> Home)
```

## Word List

~300 nouns across ~10 categories (~30 per category):

1. **Animals** — Hund, Katze, Vogel...
2. **Food & Drink** — Brot, Milch, Apfel...
3. **Household** — Tisch, Stuhl, Lampe...
4. **Body** — Kopf, Hand, Auge...
5. **Clothing** — Hemd, Hose, Schuh...
6. **Nature** — Baum, Blume, Berg...
7. **Transportation** — Auto, Zug, Fahrrad...
8. **Work & School** — Buch, Stift, Computer...
9. **Family & People** — Mutter, Kind, Freund...
10. **Time & Places** — Stadt, Haus, Tag...

## Tech Stack

- **Frontend:** React SPA
- **Hosting:** Firebase Hosting (custom domain, SSL, serves React build)
- **Backend:** Node.js + Socket.IO on Google Cloud Run (`--max-instances=1`)
- **Word Data:** Local JSON file on the server
- **Proxy:** Firebase Hosting rewrites `/socket.io/**` to Cloud Run
