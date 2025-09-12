import type { ChatInputCommandInteraction } from 'discord.js';
import { PermissionFlagsBits } from 'discord.js';
import type { PermissionConfig, PermissionResult, PermissionValidator, PermissionLevel } from '../types';
import { Logger } from './logger';

export class PermissionService implements PermissionValidator {
  private botOwnerId?: string;
  
  constructor(private logger: Logger, botOwnerId?: string) {
    this.botOwnerId = botOwnerId;
  }

  async validate(interaction: ChatInputCommandInteraction, config: PermissionConfig): Promise<PermissionResult> {
    try {
      // No permissions required - allow everyone
      if (!config) {
        return { allowed: true };
      }

      // Owner-only check
      if (config.ownerOnly && interaction.user.id !== this.botOwnerId) {
        return { 
          allowed: false, 
          reason: 'This command is restricted to the bot owner only.' 
        };
      }

      // Guild-only check
      if (config.guildOnly && !interaction.guild) {
        return { 
          allowed: false, 
          reason: 'This command can only be used in a server.' 
        };
      }

      // Specific user check
      if (config.users && config.users.length > 0) {
        if (!config.users.includes(interaction.user.id)) {
          return { 
            allowed: false, 
            reason: 'You are not authorized to use this command.' 
          };
        }
      }

      // Channel restriction check
      if (config.channels && config.channels.length > 0) {
        if (!config.channels.includes(interaction.channelId)) {
          return { 
            allowed: false, 
            reason: 'This command cannot be used in this channel.' 
          };
        }
      }

      // Role-based check
      if (config.roles && config.roles.length > 0 && interaction.guild) {
        const member = interaction.guild.members.cache.get(interaction.user.id);
        if (!member) {
          return { 
            allowed: false, 
            reason: 'Unable to verify your server membership.' 
          };
        }

        const hasRequiredRole = config.roles.some(roleId => 
          member.roles.cache.has(roleId)
        );

        if (!hasRequiredRole) {
          return { 
            allowed: false, 
            reason: 'You do not have the required role to use this command.' 
          };
        }
      }

      // Permission level check
      if (config.level && interaction.guild) {
        const hasPermission = await this.checkPermissionLevel(interaction, config.level);
        if (!hasPermission.allowed) {
          return hasPermission;
        }
      }

      // Custom check
      if (config.customCheck) {
        try {
          const customResult = await config.customCheck(interaction);
          if (!customResult) {
            return { 
              allowed: false, 
              reason: 'Custom permission check failed.' 
            };
          }
        } catch (error) {
          this.logger.error('Custom permission check failed', { 
            error, 
            command: interaction.commandName,
            userId: interaction.user.id 
          });
          return { 
            allowed: false, 
            reason: 'Permission check encountered an error.' 
          };
        }
      }

      return { allowed: true };

    } catch (error) {
      this.logger.error('Permission validation failed', { 
        error, 
        command: interaction.commandName,
        userId: interaction.user.id 
      });
      return { 
        allowed: false, 
        reason: 'Unable to verify permissions.' 
      };
    }
  }

  private async checkPermissionLevel(interaction: ChatInputCommandInteraction, requiredLevel: PermissionLevel): Promise<PermissionResult> {
    if (!interaction.guild) {
      return { 
        allowed: false, 
        reason: 'Permission levels can only be checked in servers.' 
      };
    }

    const member = interaction.guild.members.cache.get(interaction.user.id);
    if (!member) {
      return { 
        allowed: false, 
        reason: 'Unable to verify your server membership.' 
      };
    }

    switch (requiredLevel) {
      case 'owner':
        if (interaction.user.id !== this.botOwnerId) {
          return { 
            allowed: false, 
            reason: 'This command requires bot owner permissions.' 
          };
        }
        break;

      case 'admin':
        if (!member.permissions.has(PermissionFlagsBits.Administrator) && 
            interaction.user.id !== this.botOwnerId) {
          return { 
            allowed: false, 
            reason: 'This command requires administrator permissions.' 
          };
        }
        break;

      case 'moderator':
        const moderatorPermissions = [
          PermissionFlagsBits.Administrator,
          PermissionFlagsBits.ModerateMembers,
          PermissionFlagsBits.BanMembers,
          PermissionFlagsBits.KickMembers,
          PermissionFlagsBits.ManageMessages
        ];

        const hasModerator = moderatorPermissions.some(perm => member.permissions.has(perm)) || 
                           interaction.user.id === this.botOwnerId;

        if (!hasModerator) {
          return { 
            allowed: false, 
            reason: 'This command requires moderator permissions.' 
          };
        }
        break;

      case 'user':
        // All users allowed by default
        break;

      default:
        return { 
          allowed: false, 
          reason: 'Unknown permission level.' 
        };
    }

    return { allowed: true };
  }

  setBotOwner(ownerId: string): void {
    this.botOwnerId = ownerId;
  }
}