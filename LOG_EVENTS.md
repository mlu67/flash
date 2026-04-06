# Log Event Types

All structured log events emitted by the server. Each log entry includes `event_type` as a field in the JSON payload, queryable in Google Cloud Logging via `jsonPayload.event_type`.

## Server Lifecycle

| event_type | severity | description | key fields |
|---|---|---|---|
| `server_started` | INFO | Server process started | `port` |

## Connections

| event_type | severity | description | key fields |
|---|---|---|---|
| `connection` | INFO | WebSocket connection established (with GeoIP) | `player_id`, `ip`, `region` |
| `connection_rejected` | WARN | Connection refused because server is at max capacity | `current_connections` |
| `player_connected` | INFO | Player registered in socket handler | `player_id` |
| `player_disconnected` | INFO | Player disconnected | `player_id`, `player_name`, `room_code` |

## Rooms

| event_type | severity | description | key fields |
|---|---|---|---|
| `room_created` | INFO | Host created a new room | `room_code`, `player_name` |
| `player_joined` | INFO | Player joined an existing room | `room_code`, `player_name` |
| `join_room_failed` | WARN | Player tried to join a non-existent room | `room_code`, `player_id` |
| `room_stale_removed` | INFO | Stale room cleaned up by periodic sweep | `room_code`, `player_count`, `status` |
| `stale_cleanup` | INFO | Periodic stale room cleanup completed | `rooms_removed`, `rooms_remaining` |

## Game

| event_type | severity | description | key fields |
|---|---|---|---|
| `game_started` | INFO | Host started the game | `room_code`, `category`, `question_count`, `player_count`, `players` |
| `game_ended` | INFO | All questions completed, final results | `room_code`, `leaderboard`, `player_count` |
| `start_game_denied` | WARN | Non-host or invalid start-game attempt | `room_code`, `player_id`, `reason` |
| `submit_answer_rejected` | WARN | Answer submitted to invalid/finished room | `room_code`, `player_id`, `reason` |

## Errors

| event_type | severity | description | key fields |
|---|---|---|---|
| `unhandled_error` | ERROR | Uncaught error in a socket handler | `err.message`, `err.stack` |

## Example Cloud Logging Queries

```
# All connections by region
jsonPayload.event_type="connection"

# Failed join attempts
jsonPayload.event_type="join_room_failed"

# Game starts with player list
jsonPayload.event_type="game_started"

# Errors
jsonPayload.severity="ERROR"
```
