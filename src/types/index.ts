import type {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
  ClientEvents,
} from 'discord.js';

// Business Logic Types
export interface InviteData {
  id: string;
  creatorId: string;
  code: string;
  uses: number;
  maxUses?: number;
  expiresAt?: Date;
  createdAt: Date;
  channelId: string;
}

export interface InviteUsage {
  id: string;
  inviteId: string;
  userId: string;
  joinedAt: Date;
  leftAt?: Date;
  isActive: boolean;
}

export interface UserStats {
  userId: string;
  totalInvites: number;
  totalUses: number;
  activeUses: number;
  invites: InviteData[];
}

export interface AdminInviteInfo {
  id: string;
  creatorId: string;
  code: string;
  uses: number;
  activeUses: number;
  maxUses?: number;
  expiresAt?: Date;
  createdAt: Date;
  channelId: string;
  creatorLeft?: boolean;
}

export interface LeaderboardEntry {
  creator_id: string;
  total_invites: number;
  total_uses: number;
  active_uses: number;
}

export interface DatabaseResult {
  id: string;
  creator_id: string;
  code: string;
  uses: number;
  max_uses: number | null;
  expires_at: string | null;
  created_at: string;
  channel_id: string;
}

export interface InviteUsageResult {
  id: string;
  invite_id: string;
  user_id: string;
  joined_at: string;
  left_at: string | null;
  is_active: number;
}

export interface LogMeta {
  [key: string]: unknown;
}

// Enhanced Permission System
export type PermissionLevel = 'user' | 'moderator' | 'admin' | 'owner';

export interface PermissionConfig {
  level?: PermissionLevel;
  roles?: string[];
  users?: string[];
  channels?: string[];
  guildOnly?: boolean;
  ownerOnly?: boolean;
  customCheck?: (interaction: ChatInputCommandInteraction) => Promise<boolean> | boolean;
}

export interface PermissionResult {
  allowed: boolean;
  reason?: string;
}

export interface PermissionValidator {
  validate(
    interaction: ChatInputCommandInteraction,
    config: PermissionConfig
  ): Promise<PermissionResult>;
}

// Enhanced Command Interface with flexible dependencies
export interface Command {
  name: string;
  description: string;
  permissions?: PermissionConfig;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
  data: SlashCommandBuilder | SlashCommandOptionsOnlyBuilder;
}

// Base command class with dependency injection
export abstract class BaseCommand implements Command {
  abstract name: string;
  abstract description: string;
  permissions?: PermissionConfig;

  abstract execute(interaction: ChatInputCommandInteraction): Promise<void>;
  abstract get data(): SlashCommandBuilder | SlashCommandOptionsOnlyBuilder;
}

// Generic Event System
export type EventName = keyof ClientEvents;

// Generic Event Handler Interface
export interface Event<T extends EventName = EventName> {
  name: T;
  once?: boolean;
  execute: (...args: ClientEvents[T]) => Promise<void>;
}

declare module 'discord.js' {
  interface Client {
    invites: Map<string, Map<string, { uses: number }>>;
  }
}
