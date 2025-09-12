# Discord Invite Tracker Bot

A Discord bot that tracks invite links and provides detailed statistics about user invites. Built with Discord.js v14 and Bun runtime.

## Features

- **Create Invite Links**: Generate trackable invite links with customizable settings
- **Invite Statistics**: View detailed statistics for your created invites
- **User Tracking**: See which users joined using your invite links
- **Leaderboard**: Global ranking of top inviters
- **Advanced Logging**: Comprehensive logging system for monitoring and debugging
- **Event-Driven Architecture**: Clean, modular event handling system

## Prerequisites

- Node.js 16+ or Bun runtime
- A Discord bot token
- Discord application with bot permissions

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   bun install
   ```

3. Copy the environment file:
   ```bash
   cp .env.example .env
   ```

4. Fill in your bot credentials in `.env`:
   ```
   DISCORD_TOKEN=your_bot_token_here
   DISCORD_CLIENT_ID=your_client_id_here
   DISCORD_GUILD_ID=your_guild_id_here  # Optional
   ```

## Bot Permissions

The bot requires the following permissions:
- View Channels
- Manage Server (for creating invites)
- Read Message History

## Usage

### Starting the Bot

```bash
# Development mode (with hot reload)
bun run dev

# Production mode
bun run start
```

### Slash Commands

#### `/create-invite`
Create a new trackable invite link.

**Options:**
- `channel` (required): The channel for the invite
- `max_uses` (optional): Maximum number of uses
- `expires_in` (optional): Expiration time in hours

#### `/check-invites`
View your invite statistics including total invites created and uses.

#### `/list-users`
List users who joined using your invites.

**Options:**
- `invite_code` (optional): View users for a specific invite code

#### `/leaderboard`
Display the global invite leaderboard.

**Options:**
- `limit` (optional): Number of users to show (default: 10)

## Architecture

The bot follows a clean architecture pattern with the following structure:

```
src/
├── commands/          # Slash command implementations
├── events/           # Discord event handlers
├── services/         # Business logic services
├── types/           # TypeScript type definitions
└── utils/           # Utility functions
```

### Key Components

- **DatabaseService**: Handles SQLite database operations for invite tracking
- **Logger**: Advanced logging system with multiple log levels
- **EventFactory**: Factory pattern for creating event handlers
- **CommandRegistry**: Manages slash command registration and execution

## Database Schema

The bot uses SQLite with the following tables:

- `invites`: Stores invite link information
- `invite_usages`: Tracks which users joined via which invites

## Development

### Adding New Commands

1. Create a new command class in `src/commands/`
2. Implement the `Command` interface
3. Register the command in `CommandRegistry`

### Adding New Events

1. Add event handler methods to `EventFactory`
2. Include the event in the `getAllEvents()` method

## Logging

Logs are written to `bot.log` with the following levels:
- DEBUG: Detailed debugging information
- INFO: General information
- WARN: Warning messages
- ERROR: Error messages

Set `LOG_LEVEL=debug` in your `.env` file for verbose logging.

## Contributing

1. Follow the existing code style and architecture patterns
2. Add appropriate TypeScript types
3. Include error handling and logging
4. Test your changes thoroughly

## License

MIT License
