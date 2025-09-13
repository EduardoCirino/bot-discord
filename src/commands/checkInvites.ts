import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { DatabaseService } from '../services/database';
import { Logger } from '../services/logger';
import { BaseCommand } from '../types';

export class CheckInvitesCommand extends BaseCommand {
  name = 'check-invites';
  description = 'Check your invite statistics';

  constructor(
    private database: DatabaseService,
    private logger: Logger
  ) {
    super();
  }

  get data() {
    return new SlashCommandBuilder().setName(this.name).setDescription(this.description);
  }

  async execute(interaction: ChatInputCommandInteraction) {
    try {
      const stats = await this.database.getUserStats(interaction.user.id);

      if (stats.invites.length === 0) {
        await interaction.reply({
          content:
            "You haven't created any invites yet. Use `/create-invite` to create your first invite!",
          flags: 64,
        });
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle('📊 Your Invite Statistics')
        .setColor(0x0099ff)
        .addFields(
          { name: 'Total Invites Created', value: stats.totalInvites.toString(), inline: true },
          { name: 'Active Uses', value: stats.activeUses.toString(), inline: true },
          { name: 'Total Uses', value: stats.totalUses.toString(), inline: true },
          {
            name: 'Active Invites',
            value: stats.invites
              .filter(i => !i.expiresAt || i.expiresAt > new Date())
              .length.toString(),
            inline: true,
          }
        )
        .setTimestamp();

      if (stats.invites.length > 0) {
        const inviteList = stats.invites
          .slice(0, 10)
          .map(
            invite =>
              `\`${invite.code}\` - ${invite.uses} uses${invite.maxUses ? `/${invite.maxUses}` : ''}${invite.expiresAt ? ` (expires ${invite.expiresAt.toLocaleDateString()})` : ''}`
          )
          .join('\n');

        embed.addFields({ name: 'Your Invites', value: inviteList, inline: false });
      }

      this.logger.commandExecuted(this.name, interaction.user.id, interaction.guild?.id);
      await interaction.reply({ embeds: [embed], flags: 64 });
    } catch (error) {
      this.logger.error('Failed to check invites', { error, userId: interaction.user.id });
      await interaction.reply({
        content: '❌ Failed to retrieve invite statistics. Please try again.',
        flags: 64,
      });
    }
  }
}
