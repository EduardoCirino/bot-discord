import { Client, GatewayIntentBits, Events, type Interaction } from 'discord.js';
import { DatabaseService } from './src/services/database';
import { Logger } from './src/services/logger';
import { DynamicEventRegistry } from './src/utils/dynamic-event-registry.ts';
import { DynamicCommandRegistry } from './src/utils/dynamic-command-registry.ts';
import {CommandHandler} from "./src/services/command-handler.ts";
import {PermissionService} from "./src/services/permissions.ts";

// Load environment variables
const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const GUILD_ID = process.env.DISCORD_GUILD_ID; // Optional: for faster command registration during development

if (!TOKEN || !CLIENT_ID) {
  console.error('Missing required environment variables: DISCORD_TOKEN and DISCORD_CLIENT_ID');
  process.exit(1);
}

async function main() {
  // Initialize services
  const logger = new Logger('./bot.log', process.env.LOG_LEVEL === 'debug' ? 0 : 1);
  const database = new DatabaseService('./invites.db');

  // Initialize Discord client
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildInvites
    ]
  });

  // Initialize dynamic command registry
  const commandRegistry = new DynamicCommandRegistry(database, logger);
  await commandRegistry.loadCommands();

  // Initialize dynamic event registry
  const eventRegistry = new DynamicEventRegistry(database, logger);
  await eventRegistry.loadEvents();
  eventRegistry.registerEvents(client);

  const permissionService = new PermissionService(logger);
  const commandHandler = new CommandHandler(permissionService, logger);

  // Handle slash command interactions
  client.on(Events.InteractionCreate, async (interaction: Interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const command = commandRegistry.getCommands().get(interaction.commandName);

    if (!command) {
      logger.warn('Unknown command executed', { commandName: interaction.commandName });
      return;
    }

    try {
      await commandHandler.execute(command, interaction)
    } catch (error) {
      logger.error('Command execution failed', { error, commandName: interaction.commandName });
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
      } else {
        await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
      }
    }
  });

  // Register commands with Discord
  try {
    await commandRegistry.registerWithDiscord(TOKEN!, CLIENT_ID!, GUILD_ID);
  } catch (error) {
    logger.error('Failed to register commands', { error });
    process.exit(1);
  }

  // Login to Discord
  try {
    await client.login(TOKEN!);
    logger.info('Bot logged in successfully');
  } catch (error) {
    logger.error('Failed to login', { error });
    process.exit(1);
  }

  // Graceful shutdown
  process.on('SIGINT', () => {
    logger.info('Received SIGINT, shutting down gracefully...');
    database.close();
    client.destroy();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    logger.info('Received SIGTERM, shutting down gracefully...');
    database.close();
    client.destroy();
    process.exit(0);
  });
}

main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});