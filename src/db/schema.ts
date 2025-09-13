import {
  pgTable,
  text,
  integer,
  timestamp,
  boolean,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const invites = pgTable(
  'invites',
  {
    id: text('id').primaryKey(),
    creatorId: text('creator_id').notNull(),
    code: text('code').notNull().unique(),
    uses: integer('uses').notNull().default(0),
    maxUses: integer('max_uses'),
    expiresAt: timestamp('expires_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    channelId: text('channel_id').notNull(),
  },
  table => [
    index('idx_invites_creator_id').on(table.creatorId),
    index('idx_invites_code').on(table.code),
  ]
);

export const inviteUsages = pgTable(
  'invite_usages',
  {
    id: text('id').primaryKey(),
    inviteId: text('invite_id')
      .notNull()
      .references(() => invites.id),
    userId: text('user_id').notNull(),
    joinedAt: timestamp('joined_at').notNull().defaultNow(),
    leftAt: timestamp('left_at'),
    isActive: boolean('is_active').notNull().default(true),
  },
  table => [
    index('idx_invite_usages_invite_id').on(table.inviteId),
    index('idx_invite_usages_user_id').on(table.userId),
    index('idx_invite_usages_is_active').on(table.isActive),
    uniqueIndex('unique_invite_user').on(table.inviteId, table.userId),
  ]
);

export const invitesRelations = relations(invites, ({ many }) => ({
  usages: many(inviteUsages),
}));

export const inviteUsagesRelations = relations(inviteUsages, ({ one }) => ({
  invite: one(invites, {
    fields: [inviteUsages.inviteId],
    references: [invites.id],
  }),
}));
