import { Events, type Client } from 'discord.js';
import { DatabaseService } from '../services/database';
import { Logger } from '../services/logger';
import type { Event } from '../types';

export class ClientReadyHandler implements Event<Events.ClientReady> {
  name = Events.ClientReady as const;
  once = true as const;
  
  constructor(
    private database: DatabaseService, 
    private logger: Logger
  ) {}

  execute = async (client: Client<true>): Promise<void> => {
    
    try {
      this.logger.info('Bot is ready', { username: client.user?.tag });

      // Cache invites for all guilds
      for (const guild of client.guilds.cache.values()) {
        try {
          const invites = await guild.invites.fetch();
          const cachedInvites = new Map();
          invites.forEach((invite) => cachedInvites.set(invite.code, { uses: invite.uses || 0 }));
          if (!client.invites) client.invites = new Map();
          client.invites.set(guild.id, cachedInvites);
        } catch (error) {
          this.logger.warn('Failed to cache invites for guild', { guildId: guild.id, error });
        }
      }
    } catch (error) {
      this.logger.error('Failed to handle client ready event', { error });
    }
  };
}