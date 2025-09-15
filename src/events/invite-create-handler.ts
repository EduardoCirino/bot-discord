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

      // Check if this invite already exists in our database
      const existingInvite = await this.database.getInviteByCode(invite.code);
      if (existingInvite) {
        this.logger.debug('Invite already exists in database', {
          inviteCode: invite.code,
          existingCreator: existingInvite.creatorId,
          newCreator: invite.inviterId,
        });
        return;
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
