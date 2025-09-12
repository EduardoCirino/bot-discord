import { type ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
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
          const embed = new EmbedBuilder()
            .setTitle('Permission Denied')
            .setDescription(
              permissionResult.reason || 'You do not have permission to use this command.'
            )
            .setColor(0xff0000);
          await interaction.reply({
            embeds: [embed],
            flags: 64,
          });

          this.logger.info('Command permission denied', {
            command: command.name,
            userId: interaction.user.id,
            reason: permissionResult.reason,
          });

          return;
        }
      }

      // Execute the command
      await command.execute(interaction);

      this.logger.debug('Command executed successfully', {
        command: command.name,
        userId: interaction.user.id,
        guildId: interaction.guild?.id,
      });
    } catch (error) {
      this.logger.error('Command execution failed', {
        error,
        command: command.name,
        userId: interaction.user.id,
        guildId: interaction.guild?.id,
      });

      const embed = new EmbedBuilder()
        .setTitle('Error')
        .setDescription('An error occurred while executing this command.')
        .setColor(0xff0000);

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ embeds: [embed], flags: 64 });
      } else {
        await interaction.reply({ embeds: [embed], flags: 64 });
      }
    }
  }
}
