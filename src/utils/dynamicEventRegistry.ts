import { readdirSync } from 'fs';
import { join } from 'path';
import type { Client } from 'discord.js';
import { DatabaseService } from '../services/database';
import { Logger } from '../services/logger';


// Type-safe event handler interface that works with the dynamic system
interface TypedEventHandler {
  name: string;
  once?: boolean;
  execute: (...args: unknown[]) => Promise<void>;
}

export class DynamicEventRegistry {
  private events: TypedEventHandler[] = [];
  private database: DatabaseService;
  private logger: Logger;

  constructor(database: DatabaseService, logger: Logger) {
    this.database = database;
    this.logger = logger;
  }

  async loadEvents(): Promise<void> {
    const eventsPath = join(process.cwd(), 'src', 'events');
    
    try {
      const eventFiles = readdirSync(eventsPath).filter(file => 
        file.endsWith('.ts') && file.endsWith('-handler.ts')
      );
      
      for (const file of eventFiles) {
        try {
          const eventModule = await import(`../events/${file.replace('.ts', '')}`);
          const EventClass = Object.values(eventModule)[0] as new (database: DatabaseService, logger: Logger) => TypedEventHandler;
          
          if (EventClass && typeof EventClass === 'function') {
            const event = new EventClass(this.database, this.logger);
            this.events.push(event);
            this.logger.debug(`Loaded event: ${event.name}`);
          }
        } catch (error) {
          this.logger.error(`Failed to load event from ${file}`, { error });
        }
      }
      
      this.logger.info(`Loaded ${this.events.length} events`);
    } catch (error) {
      this.logger.error('Failed to read events directory', { error });
    }
  }

  registerEvents(client: Client): void {
    for (const event of this.events) {
      if (event.once) {
        client.once(event.name, event.execute);
      } else {
        client.on(event.name, event.execute);
      }
      this.logger.debug(`Registered event: ${event.name}`);
    }
  }

  getEvents(): TypedEventHandler[] {
    return this.events;
  }
}