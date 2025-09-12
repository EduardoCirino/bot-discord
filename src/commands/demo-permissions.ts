import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { DatabaseService } from '../services/database';
import { Logger } from '../services/logger';
import type { BaseCommand } from '../types';

export class DemoPermissionsCommand implements BaseCommand {
  name = 'demo-permissions';
  description = 'Demonstrates different permission configurations';

  // Example of complex permission config with custom validation
  permissions = {
    level: 'moderator' as const,
    guildOnly: true,
    customCheck: (_interaction: ChatInputCommandInteraction) => {
      // Example: Only allow on weekdays
      const now = new Date();
      const dayOfWeek = now.getDay();
      return dayOfWeek >= 1 && dayOfWeek <= 5; // Monday to Friday
    },
  };

  constructor(
    private database: DatabaseService,
    private logger: Logger
  ) {}

  get data() {
    return new SlashCommandBuilder().setName(this.name).setDescription(this.description);
  }

  async execute(interaction: ChatInputCommandInteraction) {
    const embed = new EmbedBuilder()
      .setTitle('🔐 Permission System Demo')
      .setDescription('You have the required permissions to view this!')
      .setColor(0x00ff00)
      .addFields(
        {
          name: 'Permission Requirements',
          value: [
            '✅ Moderator level or higher',
            '✅ Guild-only command',
            '✅ Weekday access only',
            '✅ All checks passed!',
          ].join('\n'),
          inline: false,
        },
        {
          name: 'Available Permission Types',
          value: [
            '• **level**: `user`, `moderator`, `admin`, `owner`',
            '• **roles**: Specific role IDs',
            '• **users**: Specific user IDs',
            '• **channels**: Specific channel IDs',
            '• **guildOnly**: Server-only restriction',
            '• **ownerOnly**: Bot owner only',
            '• **customCheck**: Custom validation function',
          ].join('\n'),
          inline: false,
        }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed], flags: 64 });

    this.logger.commandExecuted(this.name, interaction.user.id, interaction.guild?.id);
  }
}

// Example of different permission configurations:

export class UserLevelCommand implements BaseCommand {
  name = 'user-command';
  description = 'Available to all users';
  // No permissions = everyone can use

  constructor(
    private database: DatabaseService,
    private logger: Logger
  ) {}

  get data() {
    return new SlashCommandBuilder().setName(this.name).setDescription(this.description);
  }

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.reply({ content: 'Hello user! 👋', flags: 64 });
  }
}

export class RoleBasedCommand implements BaseCommand {
  name = 'role-command';
  description = 'Requires specific roles';

  permissions = {
    roles: ['123456789', '987654321'], // Example role IDs
    guildOnly: true,
  };

  constructor(
    private database: DatabaseService,
    private logger: Logger
  ) {}

  get data() {
    return new SlashCommandBuilder().setName(this.name).setDescription(this.description);
  }

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.reply({ content: 'You have the required role! 🎭', flags: 64 });
  }
}

export class OwnerOnlyCommand implements BaseCommand {
  name = 'owner-command';
  description = 'Bot owner only';

  permissions = {
    ownerOnly: true,
  };

  constructor(
    private database: DatabaseService,
    private logger: Logger
  ) {}

  get data() {
    return new SlashCommandBuilder().setName(this.name).setDescription(this.description);
  }

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.reply({ content: 'Welcome, bot owner! 👑', flags: 64 });
  }
}
