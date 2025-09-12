import { Events, type Invite } from 'discord.js';
import { DatabaseService } from '../services/database';
import { Logger } from '../services/logger';
import type { Event } from '../types';

export class InviteCreateHandler implements Event<Events.InviteCreate> {
  name = Events.InviteCreate as const;

  constructor(
    private database: DatabaseService,
    private logger: Logger
  ) {}

  execute = async (invite: Invite): Promise<void> => {
    try {
      // Skip if this invite was created by the bot itself
      if (invite.inviterId === invite.client.user?.id) {
        this.logger.debug('Skipping invite created by bot', { inviteCode: invite.code });
        return;
      }

      // If inviterId is null or empty, this might be a bot-created invite, skip it
      if (!invite.inviterId) {
        this.logger.debug('Skipping invite without inviter ID (likely bot-created)', {
          inviteCode: invite.code,
        });
        return;
      }

      // Check if this invite was already created recently (within last 5 seconds)
      // This prevents double-storage when the command creates an invite
      const existingInvite = await this.database.getInviteByCode(invite.code);
      if (existingInvite) {
        const createdAt = new Date(existingInvite.createdAt);
        const now = new Date();
        const timeDiff = now.getTime() - createdAt.getTime();

        // If the invite was created within the last 5 seconds, skip storing it again
        if (timeDiff < 5000) {
          this.logger.debug('Skipping recently created invite to prevent double storage', {
            inviteCode: invite.code,
            existingCreator: existingInvite.creatorId,
            timeDiff,
          });
          return;
        }
      }

      await this.database.createInvite({
        creatorId: invite.inviterId,
        code: invite.code,
        maxUses: invite.maxUses || undefined,
        expiresAt: invite.expiresAt || undefined,
        channelId: invite.channelId || '',
      });

      this.logger.inviteCreated(invite.inviterId, invite.code, invite.channelId || '');
    } catch (error) {
      this.logger.error('Failed to handle invite creation', {
        error,
        inviteCode: invite.code,
        inviterId: invite.inviterId,
      });
    }
  };
}
