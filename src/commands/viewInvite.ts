import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { DatabaseService } from '../services/database';
import { Logger } from '../services/logger';
import type { Command } from '../types';

export class ViewInviteCommand implements Command {
  name = 'view-invite';
  description = 'View detailed information about a specific invite';

  constructor(private database: DatabaseService, private logger: Logger) {}

  get data() {
    return new SlashCommandBuilder()
      .setName(this.name)
      .setDescription(this.description)
      .addStringOption(option =>
        option.setName('code')
          .setDescription('The invite code to view')
          .setRequired(true)
      );
  }

  async execute(interaction: ChatInputCommandInteraction) {
    try {
      const inviteCode = interaction.options.getString('code', true);

      const inviteDetails = await this.database.getInviteDetails(inviteCode);

      if (!inviteDetails) {
        await interaction.reply({
          content: '❌ Invite code not found.',
          flags: 64
        });
        return;
      }

      const { invite, usages } = inviteDetails;

      // Check if user can view this invite (creator or admin)
      const isCreator = invite.creatorId === interaction.user.id;
      const isAdmin = interaction.memberPermissions?.has('Administrator') || false;

      if (!isCreator && !isAdmin) {
        await interaction.reply({
          content: '❌ You can only view invites you created.',
          flags: 64
        });
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle(`📋 Invite Details: \`${invite.code}\``)
        .setColor(0x4ECDC4)
        .addFields(
          { name: 'Creator', value: `<@${invite.creatorId}>`, inline: true },
          { name: 'Channel', value: `<#${invite.channelId}>`, inline: true },
          { name: 'Created', value: invite.createdAt.toLocaleDateString(), inline: true },
          { name: 'Uses', value: `${invite.uses}${invite.maxUses ? `/${invite.maxUses}` : ''}`, inline: true },
          { name: 'Expires', value: invite.expiresAt ? invite.expiresAt.toLocaleDateString() : 'Never', inline: true },
          { name: 'Active Users', value: usages.filter(u => u.isActive).length.toString(), inline: true }
        )
        .setTimestamp();

      if (usages.length > 0) {
        const activeUsers = usages.filter(u => u.isActive);
        const leftUsers = usages.filter(u => !u.isActive);

        if (activeUsers.length > 0) {
          const activeList = activeUsers.slice(0, 10).map(usage =>
            `<@${usage.userId}> - Joined ${usage.joinedAt.toLocaleDateString()}`
          ).join('\n');

          embed.addFields({
            name: `Active Users (${activeUsers.length})`,
            value: activeList,
            inline: false
          });
        }

        if (leftUsers.length > 0) {
          const leftList = leftUsers.slice(0, 10).map(usage =>
            `<@${usage.userId}> - Joined ${usage.joinedAt.toLocaleDateString()}, Left ${usage.leftAt?.toLocaleDateString() || 'Unknown'}`
          ).join('\n');

          embed.addFields({
            name: `Users Who Left (${leftUsers.length})`,
            value: leftList,
            inline: false
          });
        }

        if (usages.length > 20) {
          embed.setFooter({ text: `Showing 20/${usages.length} users. Use pagination for more.` });
        }
      } else {
        embed.addFields({ name: 'Users', value: 'No users have joined with this invite yet.', inline: false });
      }

      this.logger.commandExecuted(this.name, interaction.user.id, interaction.guild?.id);
      await interaction.reply({ embeds: [embed], flags: 64 });
    } catch (error) {
      this.logger.error('Failed to view invite', { error, userId: interaction.user.id });
      await interaction.reply({
        content: '❌ Failed to retrieve invite details. Please try again.',
        flags: 64
      });
    }
  }
}