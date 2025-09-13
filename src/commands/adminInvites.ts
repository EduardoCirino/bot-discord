import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { DatabaseService } from '../services/database';
import { Logger } from '../services/logger';
import { BaseCommand } from '../types';

export class AdminInvitesCommand extends BaseCommand {
  name = 'admin-invites';
  description = 'View all created invites (Admin only)';
  override permissions = {
    level: 'admin' as const,
    guildOnly: true,
  };

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
      const invites = await this.database.getAllInvitesForAdmin();

      if (invites.length === 0) {
        await interaction.reply({
          content: 'No invites have been created yet.',
          flags: 64,
        });
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle('📊 All Created Invites')
        .setColor(0xff6b6b)
        .setDescription(`Total invites: ${invites.length}`)
        .setTimestamp();

      // Group invites by creator for better display
      const invitesByCreator = new Map<string, typeof invites>();

      for (const invite of invites) {
        if (!invitesByCreator.has(invite.creatorId)) {
          invitesByCreator.set(invite.creatorId, []);
        }
        const creatorInvites = invitesByCreator.get(invite.creatorId);
        if (creatorInvites) {
          creatorInvites.push(invite);
        }
      }

      let description = '';
      let creatorCount = 0;

      for (const [creatorId, creatorInvites] of invitesByCreator) {
        if (creatorCount >= 10) {
          // Limit to prevent embed from being too long
          description += `\n... and ${invitesByCreator.size - creatorCount} more creators`;
          break;
        }

        const totalInvites = creatorInvites.length;
        const totalUses = creatorInvites.reduce((sum, inv) => sum + inv.uses, 0);
        const activeUses = creatorInvites.reduce((sum, inv) => sum + inv.activeUses, 0);

        description += `\n<@${creatorId}>: ${totalInvites} invites, ${activeUses}/${totalUses} active uses`;

        creatorCount++;
      }

      embed.addFields({ name: 'Creators Summary', value: description || 'No data', inline: false });

      // Show recent invites
      const recentInvites = invites.slice(0, 5);
      if (recentInvites.length > 0) {
        const recentList = recentInvites
          .map(
            invite =>
              `\`${invite.code}\` by <@${invite.creatorId}> - ${invite.activeUses}/${invite.uses} uses`
          )
          .join('\n');

        embed.addFields({ name: 'Recent Invites', value: recentList, inline: false });
      }

      this.logger.commandExecuted(this.name, interaction.user.id, interaction.guild?.id);
      await interaction.reply({ embeds: [embed], flags: 64 });
    } catch (error) {
      this.logger.error('Failed to get admin invites', { error, userId: interaction.user.id });
      await interaction.reply({
        content: '❌ Failed to retrieve invite data. Please try again.',
        flags: 64,
      });
    }
  }
}
