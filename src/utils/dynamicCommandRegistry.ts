import { REST, Routes } from 'discord.js';
import { readdirSync } from 'fs';
import { join } from 'path';
import { DatabaseService } from '../services/database';
import { Logger } from '../services/logger';
import type { Command } from '../types';

export class DynamicCommandRegistry {
  private commands: Map<string, Command> = new Map();
  private database: DatabaseService;
  private logger: Logger;

  constructor(database: DatabaseService, logger: Logger) {
    this.database = database;
    this.logger = logger;
  }

  async loadCommands(): Promise<void> {
    const commandsPath = join(process.cwd(), 'src', 'commands');
    
    try {
      const commandFiles = readdirSync(commandsPath).filter(file => file.endsWith('.ts'));
      
      for (const file of commandFiles) {
        try {
          const commandModule = await import(`../commands/${file.replace('.ts', '')}`);
          const CommandClass = Object.values(commandModule)[0] as new (database: DatabaseService, logger: Logger) => Command;
          
          if (CommandClass && typeof CommandClass === 'function') {
            const command = new CommandClass(this.database, this.logger);
            this.commands.set(command.name, command);
            this.logger.debug(`Loaded command: ${command.name}`);
          }
        } catch (error) {
          this.logger.error(`Failed to load command from ${file}`, { error });
        }
      }
      
      this.logger.info(`Loaded ${this.commands.size} commands`);
    } catch (error) {
      this.logger.error('Failed to read commands directory', { error });
    }
  }

  getCommands(): Map<string, Command> {
    return this.commands;
  }

  getCommandData() {
    return Array.from(this.commands.values()).map(cmd => cmd.data);
  }

  async registerWithDiscord(token: string, clientId: string, guildId?: string): Promise<void> {
    const rest = new REST().setToken(token);

    try {
      this.logger.info('Started refreshing application (/) commands.');

      const commands = this.getCommandData();

      if (guildId) {
        // Register for specific guild (faster for development)
        await rest.put(
          Routes.applicationGuildCommands(clientId, guildId),
          { body: commands }
        );
      } else {
        // Register globally
        await rest.put(
          Routes.applicationCommands(clientId),
          { body: commands }
        );
      }

      this.logger.info('Successfully reloaded application (/) commands.');
    } catch (error) {
      this.logger.error('Failed to register commands', { error });
      throw error;
    }
  }
}