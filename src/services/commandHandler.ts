import type { ChatInputCommandInteraction } from 'discord.js';
import type { Command } from '../types';
import { PermissionService } from './permissions';
import { Logger } from './logger';

export class CommandHandler {
  constructor(
    private permissions: PermissionService,
    private logger: Logger
  ) {}

  async execute(command: Command, interaction: ChatInputCommandInteraction): Promise<void> {
    try {
      // Validate permissions if defined
      if (command.permissions) {
        const permissionResult = await this.permissions.validate(interaction, command.permissions);
        
        if (!permissionResult.allowed) {
          await interaction.reply({
            content: `❌ ${permissionResult.reason || 'You do not have permission to use this command.'}`,
            flags: 64
          });
          
          this.logger.info('Command permission denied', {
            command: command.name,
            userId: interaction.user.id,
            reason: permissionResult.reason
          });
          
          return;
        }
      }

      // Execute the command
      await command.execute(interaction);
      
      this.logger.debug('Command executed successfully', {
        command: command.name,
        userId: interaction.user.id,
        guildId: interaction.guild?.id
      });

    } catch (error) {
      this.logger.error('Command execution failed', {
        error,
        command: command.name,
        userId: interaction.user.id,
        guildId: interaction.guild?.id
      });

      // Respond with error if not already responded
      const errorMessage = '❌ An error occurred while executing this command.';
      
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: errorMessage, flags: 64 });
      } else {
        await interaction.reply({ content: errorMessage, flags: 64 });
      }
    }
  }
}