import { SlashCommandBuilder, ChatInputCommandInteraction, ChannelType } from 'discord.js';
import { DatabaseService } from '../services/database';
import { Logger } from '../services/logger';
import { BaseCommand } from '../types';

export class CreateInviteCommand extends BaseCommand {
  name = 'create-invite';
  description = 'Create a new invite link for tracking';

  constructor(
    private database: DatabaseService,
    private logger: Logger
  ) {
    super();
  }

  get data() {
    return new SlashCommandBuilder()
      .setName(this.name)
      .setDescription(this.description)
      .addChannelOption(option =>
        option
          .setName('channel')
          .setDescription('The channel to create the invite for')
          .setRequired(true)
          .addChannelTypes(ChannelType.GuildText, ChannelType.GuildVoice)
      )
      .addIntegerOption(option =>
        option
          .setName('max_uses')
          .setDescription('Maximum number of uses (optional)')
          .setMinValue(1)
          .setMaxValue(100)
      )
      .addIntegerOption(
        option =>
          option
            .setName('expires_in')
            .setDescription('Expiration time in hours (optional)')
            .setMinValue(1)
            .setMaxValue(168) // 1 week
      );
  }

  async execute(interaction: ChatInputCommandInteraction) {
    try {
      const channel = interaction.options.getChannel('channel', true);
      const maxUses = interaction.options.getInteger('max_uses');
      const expiresIn = interaction.options.getInteger('expires_in');

      if (!interaction.guild) {
        await interaction.reply({
          content: 'This command can only be used in a server.',
          flags: 64,
        });
        return;
      }

      // Create the invite
      let invite;
      try {
        invite = await interaction.guild.invites.create(channel.id, {
          maxUses: maxUses || undefined,
          maxAge: expiresIn ? expiresIn * 3600 : 0, // Convert hours to seconds
          unique: true,
        });
      } catch (error: unknown) {
        this.logger.error('Failed to create Discord invite', {
          error,
          userId: interaction.user.id,
          channelId: channel.id,
        });
        await interaction.reply({
          content:
            '❌ Failed to create invite. The bot may not have permission to create invites in this channel.',
          flags: 64,
        });
        return;
      }

      // Store in database
      try {
        const existingInvite = await this.database.getInviteByCode(invite.code);
        await this.database.createInvite({
          creatorId: interaction.user.id,
          code: invite.code,
          maxUses: invite.maxUses || undefined,
          expiresAt: invite.expiresAt || undefined,
          channelId: channel.id,
        });

        // Check if this was a new invite or an existing one
        const isNewInvite = !existingInvite || existingInvite.creatorId !== interaction.user.id;

        if (isNewInvite) {
          this.logger.inviteCreated(interaction.user.id, invite.code, channel.id);
          await interaction.reply({
            content: `✅ Invite created successfully!\n**Code:** \`${invite.code}\`\n**Channel:** <#${channel.id}>\n**Max Uses:** ${maxUses || 'Unlimited'}\n**Expires:** ${expiresIn ? `In ${expiresIn} hours` : 'Never'}`,
            flags: 64,
          });
        } else {
          // This invite code already exists for this user
          this.logger.info('User tried to create existing invite', {
            userId: interaction.user.id,
            inviteCode: invite.code,
          });
          await interaction.reply({
            content: `ℹ️ You already have an invite with code \`${invite.code}\`.\n**Channel:** <#${channel.id}>\n**Max Uses:** ${maxUses || 'Unlimited'}\n**Expires:** ${expiresIn ? `In ${expiresIn} hours` : 'Never'}`,
            flags: 64,
          });
        }

        this.logger.commandExecuted(this.name, interaction.user.id, interaction.guild.id);
      } catch (error: unknown) {
        this.logger.error('Database error during invite creation', {
          error,
          userId: interaction.user.id,
          inviteCode: invite.code,
        });

        // Handle unique constraint violations
        const errorMsg = error instanceof Error ? error.message : String(error);
        if (errorMsg && errorMsg.includes('already exists')) {
          try {
            await invite.delete('Invite code conflict with existing tracked invite');
            await interaction.reply({
              content:
                '❌ There was a conflict with the invite code. Please try creating the invite again.',
              flags: 64,
            });
          } catch (deleteError) {
            this.logger.error('Failed to delete conflicting Discord invite', {
              error: deleteError,
              inviteCode: invite.code,
            });
            await interaction.reply({
              content:
                '❌ There was an issue with the invite creation. Please contact an administrator.',
              flags: 64,
            });
          }
        } else {
          // For other database errors, still try to delete the Discord invite to clean up
          try {
            await invite.delete('Database error during invite creation');
          } catch (deleteError) {
            this.logger.warn('Failed to delete Discord invite after database error', {
              error: deleteError,
              inviteCode: invite.code,
            });
          }

          await interaction.reply({
            content: '❌ Failed to create invite due to a database error. Please try again.',
            flags: 64,
          });
        }
      }
    } catch (error) {
      this.logger.error('Failed to create invite', { error, userId: interaction.user.id });
      await interaction.reply({
        content: '❌ Failed to create invite. Please try again.',
        flags: 64,
      });
    }
  }
}
