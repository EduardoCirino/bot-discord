import { appendFileSync } from 'fs';
import type { LogMeta } from '../types';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export class Logger {
  private logFile: string;
  private minLevel: LogLevel;

  constructor(logFile: string = './bot.log', minLevel: LogLevel = LogLevel.INFO) {
    this.logFile = logFile;
    this.minLevel = minLevel;
  }

  private formatMessage(level: string, message: string, meta?: LogMeta): string {
    const timestamp = new Date().toISOString();
    const metaStr = meta ? ` | ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] ${level}: ${message}${metaStr}\n`;
  }

  private writeToFile(message: string) {
    try {
      appendFileSync(this.logFile, message);
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  private log(level: LogLevel, levelName: string, message: string, meta?: LogMeta) {
    if (level < this.minLevel) return;

    const formattedMessage = this.formatMessage(levelName, message, meta);
    console.log(formattedMessage.trim());
    this.writeToFile(formattedMessage);
  }

  debug(message: string, meta?: LogMeta) {
    this.log(LogLevel.DEBUG, 'DEBUG', message, meta);
  }

  info(message: string, meta?: LogMeta) {
    this.log(LogLevel.INFO, 'INFO', message, meta);
  }

  warn(message: string, meta?: LogMeta) {
    this.log(LogLevel.WARN, 'WARN', message, meta);
  }

  error(message: string, meta?: LogMeta) {
    this.log(LogLevel.ERROR, 'ERROR', message, meta);
  }

  // Specialized logging methods
  commandExecuted(command: string, userId: string, guildId?: string) {
    this.info('Command executed', { command, userId, guildId });
  }

  inviteCreated(creatorId: string, code: string, channelId: string) {
    this.info('Invite created', { creatorId, code, channelId });
  }

  userJoined(userId: string, inviteCode?: string) {
    this.info('User joined guild', { userId, inviteCode });
  }

  inviteUsed(inviteId: string, userId: string) {
    this.info('Invite used', { inviteId, userId });
  }
}
