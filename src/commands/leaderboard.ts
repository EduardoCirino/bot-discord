import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { DatabaseService } from '../services/database';
import { Logger } from '../services/logger';
import type { BaseCommand } from '../types';

export class LeaderboardCommand implements BaseCommand {
  name = 'leaderboard';
  description = 'Show the invite leaderboard';

  constructor(
    private database: DatabaseService,
    private logger: Logger
  ) {}

  get data() {
    return new SlashCommandBuilder()
      .setName(this.name)
      .setDescription(this.description)
      .addIntegerOption(option =>
        option
          .setName('limit')
          .setDescription('Number of users to show (default: 10)')
          .setMinValue(1)
          .setMaxValue(25)
      );
  }

  async execute(interaction: ChatInputCommandInteraction) {
    try {
      const limit = interaction.options.getInteger('limit') || 10;
      const leaderboard = await this.database.getLeaderboard(limit);

      if (leaderboard.length === 0) {
        await interaction.reply({
          content: 'No invite data available yet.',
          flags: 64,
        });
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle('🏆 Invite Leaderboard')
        .setColor(0xffd700)
        .setDescription('Top inviters by total uses')
        .setTimestamp();

      const leaderboardText = leaderboard
        .map((entry, index) => {
          const medal =
            index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `**${index + 1}.**`;
          return `${medal} <@${entry.creator_id}> - **${entry.active_uses || 0}** active, **${entry.total_uses}** total uses (${entry.total_invites} invites)`;
        })
        .join('\n');

      embed.addFields({ name: 'Rankings', value: leaderboardText, inline: false });

      // Add user's position if not in top
      const userEntry = leaderboard.find(entry => entry.creator_id === interaction.user.id);
      if (!userEntry && interaction.guild) {
        const userStats = await this.database.getUserStats(interaction.user.id);
        if (userStats.totalUses > 0) {
          // Find user's rank
          const allLeaderboard = await this.database.getLeaderboard(1000);
          const userRank =
            allLeaderboard.findIndex(entry => entry.creator_id === interaction.user.id) + 1;

          if (userRank > 0) {
            embed.addFields({
              name: 'Your Position',
              value: `**${userRank}.** <@${interaction.user.id}> - **${userStats.activeUses}** active, **${userStats.totalUses}** total uses (${userStats.totalInvites} invites)`,
              inline: false,
            });
          }
        }
      }

      this.logger.commandExecuted(this.name, interaction.user.id, interaction.guild?.id);
      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      this.logger.error('Failed to get leaderboard', { error, userId: interaction.user.id });
      await interaction.reply({
        content: '❌ Failed to retrieve leaderboard. Please try again.',
        flags: 64,
      });
    }
  }
}
