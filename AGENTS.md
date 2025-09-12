# AGENTS.md - Discord Invite Tracker Bot

## Build/Test Commands
- `bun run start` - Production mode
- `bun run dev` - Development with hot reload  
- `bun build index.ts` - Build the project
- `bun run --check index.ts` - Lint/typecheck
- `bun test` - Run tests (no tests currently exist)

## Project Structure
```
src/
├── commands/           # Slash commands (auto-discovered)
│   ├── *.ts           # Each implements Command interface
├── events/            # Discord event handlers (auto-discovered)
│   ├── *-handler.ts   # Each implements Event interface
├── services/          # Core business logic
│   ├── database.ts    # SQLite operations with bun:sqlite
│   └── logger.ts      # Structured logging service
├── utils/             # Dynamic registries
│   ├── dynamicCommandRegistry.ts
│   └── dynamicEventRegistry.ts
└── types/             # TypeScript definitions
    └── index.ts
```

## Dynamic Architecture
- **Commands**: Auto-discovered from `src/commands/*.ts`, implement `Command` interface
- **Events**: Auto-discovered from `src/events/*-handler.ts`, implement `Event` interface  
- **Services**: Dependency-injected into commands and events via constructors
- **No manual registration** - just create files following conventions

## Code Style & Conventions
- **Runtime**: Use Bun APIs (`bun:sqlite`, `Bun.file`) over Node.js equivalents
- **Types**: Strict TypeScript with interfaces in `src/types/index.ts`
- **Imports**: Relative imports, group by external/internal, Discord.js types imported inline
- **Classes**: PascalCase classes with constructor dependency injection
- **Functions**: camelCase methods, async/await for Discord API calls
- **Error Handling**: Try/catch with structured logging via Logger service
- **Database**: Use `bun:sqlite` Database class with prepared statements
- **Discord**: SlashCommandBuilder pattern, ephemeral error responses (`flags: 64`)
- **Logging**: Structured logging with context objects, different log levels
- **Environment**: Process env variables with validation, graceful shutdown handlers

## Adding New Features

### Commands
1. Create `src/commands/my-command.ts`
2. Implement `Command` interface:
   ```ts
   export class MyCommand implements Command {
     name = 'my-command';
     description = 'Command description';
     
     constructor(private database: DatabaseService, private logger: Logger) {}
     
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

## Critical Rules
- **NO `any` types** - Use proper TypeScript types for all variables and parameters
- **Strict typing** - All database queries, Discord API responses must be properly typed
- **File naming**: Commands: `kebab-case.ts`, Events: `kebab-case-handler.ts`
- **Auto-discovery**: Never manually register commands/events - they're loaded dynamically
- Avoid asking for building the project to test
- Do not comment on the generated code.