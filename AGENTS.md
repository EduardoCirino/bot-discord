# AGENTS.md - Discord Invite Tracker Bot

## Build/Test Commands
- `bun run start` - Production mode
- `bun run dev` - Development with hot reload
- `bun run build` - Build the project
- `bun run lint` - Run ESLint
- `bun run lint:fix` - Run ESLint with auto-fix
- `bun run format` - Format code with Prettier
- `bun run format:check` - Check code formatting
- `bun run typecheck` - TypeScript type checking
- No test script configured

## Project Structure
```
src/
├── commands/           # Slash commands (auto-discovered)
│   ├── adminInvites.ts
│   ├── checkInvites.ts
│   ├── createInvite.ts
│   ├── demo-permissions.ts
│   ├── leaderboard.ts
│   ├── listUsers.ts
│   └── viewInvite.ts
├── events/            # Discord event handlers (auto-discovered)
│   ├── client-ready-handler.ts
│   ├── guild-member-add-handler.ts
│   ├── guild-member-remove-handler.ts
│   └── invite-create-handler.ts
├── services/          # Core business logic
│   ├── command-handler.ts
│   ├── database.ts    # SQLite operations with bun:sqlite
│   ├── logger.ts      # Structured logging service
│   └── permissions.ts # Permission validation service
├── utils/             # Dynamic registries
│   ├── dynamic-command-registry.ts
│   └── dynamic-event-registry.ts
└── types/             # TypeScript definitions
    └── index.ts
```

## Dynamic Architecture
- **Commands**: Auto-discovered from `src/commands/*.ts`, implement `BaseCommand` abstract class
- **Events**: Auto-discovered from `src/events/*-handler.ts`, implement `Event` interface
- **Services**: Dependency-injected into commands and events via constructors
- **Dynamic Registries**: `DynamicCommandRegistry` and `DynamicEventRegistry` handle auto-discovery
- **No manual registration** - just create files following conventions

## Code Style & Conventions
- **Runtime**: Bun runtime with TypeScript
- **Types**: Strict TypeScript with interfaces in `src/types/index.ts`
- **Imports**: Relative imports, Discord.js types imported at top level
- **Classes**: PascalCase classes extending `BaseCommand` with constructor dependency injection
- **Functions**: camelCase methods, async/await for Discord API calls
- **Error Handling**: Try/catch with structured logging via Logger service
- **Database**: SQLite with `bun:sqlite` Database class and prepared statements
- **Discord**: SlashCommandBuilder pattern, ephemeral error responses (`flags: 64`)
- **Logging**: Structured logging with context objects, different log levels
- **Permissions**: Advanced permission system with levels, roles, and custom checks
- **Environment**: Process env variables with validation

## Adding New Features

### Commands
1. Create `src/commands/my-command.ts`
2. Extend `BaseCommand` abstract class:
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
3. Command is automatically loaded on restart

### Events  
1. Create `src/events/my-event-handler.ts`
2. Implement `Event` interface:
   ```ts
   export class MyEventHandler implements Event {
     name = Events.SomeEvent;
     
     constructor(private database: DatabaseService, private logger: Logger) {}
     
     execute = async (...args: unknown[]): Promise<void> => {
       // Implementation
     };
   }
   ```
3. Event handler is automatically loaded on restart

## Code Quality & Linting

### ESLint + Prettier Setup
- **ESLint**: TypeScript-aware linting with strict rules
- **Prettier**: Consistent code formatting
- **Integration**: ESLint runs Prettier as a rule

### Available Commands
- `bun run lint` - Check for linting issues
- `bun run lint:fix` - Auto-fix linting issues where possible
- `bun run format` - Format all code with Prettier
- `bun run format:check` - Check if code is properly formatted

### Linting Rules
- TypeScript strict mode enabled
- No unused variables (except prefixed with `_`)
- Prettier formatting enforced
- Node.js globals properly configured
- Async/await patterns enforced

## Critical Rules
- **NO `any` types** - Use proper TypeScript types for all variables and parameters
- **Strict typing** - All database queries, Discord API responses must be properly typed
- **File naming**: Commands: `kebab-case.ts`, Events: `kebab-case-handler.ts`
- **Auto-discovery**: Never manually register commands/events - they're loaded dynamically
- **Code formatting**: Always run `bun run format` before committing
- Avoid asking for building the project to test
- Do not comment on the generated code.