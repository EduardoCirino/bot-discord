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
- `max_uses` (optional): Maximum number of uses (1-100)
- `expires_in` (optional): Expiration time in hours (1-168)

#### `/check-invites`
View your invite statistics including total invites created, active uses, and total uses.

#### `/list-users`
List users who joined using your invites.

**Options:**
- `invite_code` (optional): View users for a specific invite code

#### `/view-invite`
View detailed information about a specific invite.

**Options:**
- `code` (required): The invite code to view

#### `/leaderboard`
Display the global invite leaderboard.

**Options:**
- `limit` (optional): Number of users to show (default: 10, max: 25)

#### `/admin-invites` (Admin Only)
View all created invites in the server (requires Administrator permission).

#### `/demo-permissions` (Admin Only)
Demonstrate the permission system (requires Administrator permission).

## Architecture

The bot follows a dynamic architecture pattern with auto-discovery:

```
src/
├── commands/          # Slash command implementations (auto-discovered)
│   ├── adminInvites.ts
│   ├── checkInvites.ts
│   ├── createInvite.ts
│   ├── demo-permissions.ts
│   ├── leaderboard.ts
│   ├── listUsers.ts
│   └── viewInvite.ts
├── events/           # Discord event handlers (auto-discovered)
│   ├── client-ready-handler.ts
│   ├── guild-member-add-handler.ts
│   ├── guild-member-remove-handler.ts
│   └── invite-create-handler.ts
├── services/         # Core business logic services
│   ├── command-handler.ts
│   ├── database.ts
│   ├── logger.ts
│   └── permissions.ts
├── utils/           # Dynamic registries and utilities
│   ├── dynamic-command-registry.ts
│   └── dynamic-event-registry.ts
└── types/           # TypeScript type definitions
    └── index.ts
```

### Key Components

- **DatabaseService**: SQLite database operations with prepared statements
- **Logger**: Structured logging with multiple levels and context
- **PermissionsService**: Advanced permission validation system
- **DynamicCommandRegistry**: Auto-discovers and loads commands
- **DynamicEventRegistry**: Auto-discovers and loads event handlers

## Database Schema

The bot uses SQLite with the following tables:

- `invites`: Stores invite link information
- `invite_usages`: Tracks which users joined via which invites

## Development

### Adding New Commands

1. Create a new command file in `src/commands/` (e.g., `my-command.ts`)
2. Extend the `BaseCommand` abstract class:
   ```ts
   import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
   import { DatabaseService } from '../services/database';
   import { Logger } from '../services/logger';
   import { BaseCommand } from '../types';

   export class MyCommand extends BaseCommand {
     name = 'my-command';
     description = 'Command description';

     constructor(private database: DatabaseService, private logger: Logger) {
       super();
     }

     get data() {
       return new SlashCommandBuilder()
         .setName(this.name)
         .setDescription(this.description);
     }

     async execute(interaction: ChatInputCommandInteraction) {
       // Implementation
     }
   }
   ```
3. The command is automatically discovered and loaded on restart

### Adding New Events

1. Create a new event handler file in `src/events/` (e.g., `my-event-handler.ts`)
2. Implement the `Event` interface:
   ```ts
   import { Events } from 'discord.js';
   import { DatabaseService } from '../services/database';
   import { Logger } from '../services/logger';
   import { Event } from '../types';

   export class MyEventHandler implements Event {
     name = Events.SomeEvent;

     constructor(private database: DatabaseService, private logger: Logger) {}

     execute = async (...args: unknown[]): Promise<void> => {
       // Implementation
     };
   }
   ```
3. The event handler is automatically discovered and loaded on restart

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
