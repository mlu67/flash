I want to build a multiplayer web-based game to help players memorize German noun articles (der, die, das).

Core Concept

The game presents players with common German nouns, and they must choose the correct article as quickly and accurately as possible.

Game Features
Word Database
A list of ~300 of the most common German nouns
Each noun is associated with its correct article (der, die, das)

Game Setup
A player creates a game room (host)
The host selects how many nouns will be used per round (e.g., 10, 20, etc.)
Other players can join the room via a link or code

Gameplay
Once the host starts the game, all players see the same nouns in the same order
Nouns are presented one at a time
For each noun, players must quickly select the correct article (der, die, das). There's a timer for each question. It will continue to the next question when all players finish it.
Players can see a live indicator of others’ progress (e.g., how many questions they’ve answered or their response speed)
The host can also start game with no other players. It will be Single-player practice mode.

Scoring System
Points are awarded based on:
Correctness

Results
At the end of the round, a leaderboard is displayed
Rankings are based on total score
Show stats such as accuracy and average response time

Use the below tech stack:
- **Frontend:** React SPA
- **Hosting:** Firebase Hosting (custom domain, SSL, serves React build)
- **Backend:** Node.js + Socket.IO on Google Cloud Run (single instance, `--max-instances=1`)
- **Database:** Firestore (game state, players, teams, rounds)
- **Storage:** Cloud Storage (word lists by category)
- **Proxy:** Firebase Hosting rewrites `/socket.io/**` to Cloud Run