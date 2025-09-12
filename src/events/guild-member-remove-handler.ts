import { Events, type GuildMember, type PartialGuildMember } from 'discord.js';
import { DatabaseService } from '../services/database';
import { Logger } from '../services/logger';
import type { Event } from '../types';

export class GuildMemberRemoveHandler implements Event<Events.GuildMemberRemove> {
  name = Events.GuildMemberRemove as const;
  
  constructor(
    private database: DatabaseService, 
    private logger: Logger
  ) {}

  execute = async (member: GuildMember | PartialGuildMember): Promise<void> => {
    
    try {
      // Mark the user as left in all their invite usages
      const wasActive = await this.database.markUserAsLeft(member.id);

      if (wasActive) {
        this.logger.info('User left guild, updated invite tracking', { userId: member.id });
      }
    } catch (error) {
      this.logger.error('Failed to handle member leave', { error, userId: member.id });
    }
  };
}