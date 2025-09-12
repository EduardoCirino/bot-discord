import { Events, type GuildMember, type Collection, type Invite } from 'discord.js';
import { DatabaseService } from '../services/database';
import { Logger } from '../services/logger';
import type { Event } from '../types';

export class GuildMemberAddHandler implements Event<Events.GuildMemberAdd> {
  name = Events.GuildMemberAdd as const;

  constructor(
    private database: DatabaseService,
    private logger: Logger
  ) {}

  execute = async (member: GuildMember): Promise<void> => {
    try {
      // Get the invite used by checking recent invites
      const invites: Collection<string, Invite> = await member.guild.invites.fetch();
      const cachedInvites = member.client.invites?.get(member.guild.id) || new Map();

      let usedInvite: Invite | null = null;
      for (const [code, invite] of invites) {
        const cached = cachedInvites.get(code);
        if (!cached || cached.uses < (invite.uses || 0)) {
          usedInvite = invite;
          break;
        }
      }

      if (usedInvite) {
        const inviteData = await this.database.getInviteByCode(usedInvite.code);
        if (inviteData) {
          await this.database.recordInviteUsage(inviteData.id, member.id);
          await this.database.incrementInviteUses(inviteData.id);
          this.logger.inviteUsed(inviteData.id, member.id);
        }
      }

      // Update cached invites
      const newCachedInvites = new Map();
      invites.forEach((invite: Invite) => newCachedInvites.set(invite.code, { uses: invite.uses }));
      if (!member.client.invites) member.client.invites = new Map();
      member.client.invites.set(member.guild.id, newCachedInvites);

      this.logger.userJoined(member.id, usedInvite?.code);
    } catch (error) {
      this.logger.error('Failed to handle member join', { error, userId: member.id });
    }
  };
}
