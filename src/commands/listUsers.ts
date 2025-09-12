import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { DatabaseService } from '../services/database';
import { Logger } from '../services/logger';
import type { Command } from '../types';

export class ListUsersCommand implements Command {
  name = 'list-users';
  description = 'List users who joined using your invites';

  constructor(private database: DatabaseService, private logger: Logger) {}

  get data() {
    return new SlashCommandBuilder()
      .setName(this.name)
      .setDescription(this.description)
      .addStringOption(option =>
        option.setName('invite_code')
          .setDescription('Specific invite code to check (optional)')
          .setRequired(false)
      );
  }

  async execute(interaction: ChatInputCommandInteraction) {
    try {
      const inviteCode = interaction.options.getString('invite_code');

      if (inviteCode) {
        // Show users for specific invite
        const invite = await this.database.getInviteByCode(inviteCode);

        if (!invite) {
          await interaction.reply({ content: '❌ Invite code not found.', flags: 64 });
          return;
        }

        if (invite.creatorId !== interaction.user.id) {
          await interaction.reply({ content: '❌ You can only view users for invites you created.', flags: 64 });
          return;
        }

        const usages = await this.database.getInviteUsages(invite.id);

        if (usages.length === 0) {
          await interaction.reply({
            content: `No users have joined using invite \`${inviteCode}\` yet.`,
            flags: 64
          });
          return;
        }

        const embed = new EmbedBuilder()
          .setTitle(`👥 Users who joined via \`${inviteCode}\``)
          .setColor(0x00FF00)
          .setDescription(`**Total:** ${usages.length} users`)
          .addFields({
            name: 'Users',
            value: usages.slice(0, 20).map(usage =>
              `<@${usage.userId}> - Joined ${usage.joinedAt.toLocaleDateString()}${!usage.isActive ? ` (Left ${usage.leftAt?.toLocaleDateString() || 'Unknown'})` : ''}`
            ).join('\n'),
            inline: false
          })
          .setTimestamp();

        await interaction.reply({ embeds: [embed], flags: 64 });
      } else {
        // Show all users from all invites
        const invites = await this.database.getUserInvites(interaction.user.id);

        if (invites.length === 0) {
          await interaction.reply({
            content: 'You haven\'t created any invites yet.',
            flags: 64
          });
          return;
        }

        const allUsages: Array<{ userId: string; joinedAt: Date; inviteCode: string; isActive: boolean; leftAt?: Date }> = [];

        for (const invite of invites) {
          const usages = await this.database.getInviteUsages(invite.id);
          allUsages.push(...usages.map(usage => ({
            userId: usage.userId,
            joinedAt: usage.joinedAt,
            inviteCode: invite.code,
            isActive: usage.isActive,
            leftAt: usage.leftAt
          })));
        }

        if (allUsages.length === 0) {
          await interaction.reply({
            content: 'No users have joined using your invites yet.',
            flags: 64
          });
          return;
        }

        // Sort by join date, most recent first
        allUsages.sort((a, b) => b.joinedAt.getTime() - a.joinedAt.getTime());

        const embed = new EmbedBuilder()
          .setTitle('👥 All Users from Your Invites')
          .setColor(0x00FF00)
          .setDescription(`**Total:** ${allUsages.length} users`)
          .addFields({
            name: 'Recent Users',
            value: allUsages.slice(0, 20).map(usage =>
              `<@${usage.userId}> - Via \`${usage.inviteCode}\` - Joined ${usage.joinedAt.toLocaleDateString()}${!usage.isActive ? ` (Left ${usage.leftAt?.toLocaleDateString() || 'Unknown'})` : ''}`
            ).join('\n'),
            inline: false
          })
          .setTimestamp();

        await interaction.reply({ embeds: [embed], flags: 64 });
      }

      this.logger.commandExecuted(this.name, interaction.user.id, interaction.guild?.id);
    } catch (error) {
      this.logger.error('Failed to list users', { error, userId: interaction.user.id });
      await interaction.reply({ content: '❌ Failed to retrieve user list. Please try again.', flags: 64 });
    }
  }
}