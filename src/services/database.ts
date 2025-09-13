import { eq, desc, count, sum, sql, and } from 'drizzle-orm';
import { db } from '../db/connection';
import { invites, inviteUsages } from '../db/schema';
import type {
  InviteData,
  InviteUsage,
  UserStats,
  AdminInviteInfo,
  LeaderboardEntry,
} from '../types';

export class DatabaseService {
  async createInvite(invite: Omit<InviteData, 'id' | 'uses' | 'createdAt'>) {
    const id = crypto.randomUUID();

    try {
      await db.insert(invites).values({
        id,
        creatorId: invite.creatorId,
        code: invite.code,
        maxUses: invite.maxUses || null,
        expiresAt: invite.expiresAt || null,
        channelId: invite.channelId,
      });
      return id;
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('duplicate key')) {
        const existingInvite = await this.getInviteByCode(invite.code);
        if (existingInvite) {
          if (existingInvite.creatorId === invite.creatorId) {
            return existingInvite.id;
          } else {
            throw new Error(
              `Invite code '${invite.code}' already exists and belongs to another user`
            );
          }
        }
        throw new Error(`Unique constraint violation for invite code '${invite.code}'`);
      }
      throw error;
    }
  }

  async getInviteByCode(code: string): Promise<InviteData | null> {
    const result = await db.select().from(invites).where(eq(invites.code, code)).limit(1);

    if (result.length === 0) return null;

    const invite = result[0];
    if (!invite) return null;

    return {
      id: invite.id,
      creatorId: invite.creatorId,
      code: invite.code,
      uses: invite.uses,
      maxUses: invite.maxUses || undefined,
      expiresAt: invite.expiresAt || undefined,
      createdAt: invite.createdAt,
      channelId: invite.channelId,
    };
  }

  async incrementInviteUses(inviteId: string) {
    await db
      .update(invites)
      .set({ uses: sql`${invites.uses} + 1` })
      .where(eq(invites.id, inviteId));
  }

  async getUserInvites(userId: string): Promise<InviteData[]> {
    const results = await db.select().from(invites).where(eq(invites.creatorId, userId));

    return results.map(invite => ({
      id: invite.id,
      creatorId: invite.creatorId,
      code: invite.code,
      uses: invite.uses,
      maxUses: invite.maxUses || undefined,
      expiresAt: invite.expiresAt || undefined,
      createdAt: invite.createdAt,
      channelId: invite.channelId,
    }));
  }

  async recordInviteUsage(inviteId: string, userId: string) {
    const existingUsage = await db
      .select({ id: inviteUsages.id, isActive: inviteUsages.isActive })
      .from(inviteUsages)
      .where(and(eq(inviteUsages.inviteId, inviteId), eq(inviteUsages.userId, userId)))
      .limit(1);

    if (existingUsage.length > 0) {
      const usage = existingUsage[0];
      if (!usage) {
        throw new Error('Unexpected database state: usage record not found');
      }

      if (!usage.isActive) {
        await db
          .update(inviteUsages)
          .set({ isActive: true, leftAt: null })
          .where(eq(inviteUsages.id, usage.id));

        await this.incrementInviteUses(inviteId);
      }
      return usage.id;
    }

    const id = crypto.randomUUID();
    try {
      await db.insert(inviteUsages).values({
        id,
        inviteId,
        userId,
        isActive: true,
      });
      return id;
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('duplicate key')) {
        const doubleCheck = await db
          .select({ id: inviteUsages.id })
          .from(inviteUsages)
          .where(and(eq(inviteUsages.inviteId, inviteId), eq(inviteUsages.userId, userId)))
          .limit(1);

        if (doubleCheck.length > 0) {
          const existingRecord = doubleCheck[0];
          if (!existingRecord) {
            throw new Error('Unexpected database state: record not found');
          }
          return existingRecord.id;
        }
      }
      throw error;
    }
  }

  async getInviteUsages(inviteId: string): Promise<InviteUsage[]> {
    const usages = await db.select().from(inviteUsages).where(eq(inviteUsages.inviteId, inviteId));

    return usages.map(usage => ({
      id: usage.id,
      inviteId: usage.inviteId,
      userId: usage.userId,
      joinedAt: usage.joinedAt,
      leftAt: usage.leftAt || undefined,
      isActive: usage.isActive,
    }));
  }

  async markUserAsLeft(userId: string) {
    const result = await db
      .update(inviteUsages)
      .set({ isActive: false, leftAt: new Date() })
      .where(and(eq(inviteUsages.userId, userId), eq(inviteUsages.isActive, true)))
      .returning({ inviteId: inviteUsages.inviteId });

    for (const usage of result) {
      await db
        .update(invites)
        .set({ uses: sql`GREATEST(0, ${invites.uses} - 1)` })
        .where(eq(invites.id, usage.inviteId));
    }

    return result.length > 0;
  }

  async getUserStats(userId: string): Promise<UserStats> {
    const userInvites = await this.getUserInvites(userId);
    const totalUses = userInvites.reduce((sum: number, invite: InviteData) => sum + invite.uses, 0);
    const activeUses = await this.getActiveUsesForUser(userId);

    return {
      userId,
      totalInvites: userInvites.length,
      totalUses,
      activeUses,
      invites: userInvites,
    };
  }

  async getActiveUsesForUser(userId: string) {
    const result = await db
      .select({ activeCount: count() })
      .from(inviteUsages)
      .innerJoin(invites, eq(inviteUsages.inviteId, invites.id))
      .where(and(eq(invites.creatorId, userId), eq(inviteUsages.isActive, true)));

    const firstResult = result[0];
    return firstResult?.activeCount || 0;
  }

  async getLeaderboard(limit: number = 10): Promise<LeaderboardEntry[]> {
    const results = await db
      .select({
        creator_id: invites.creatorId,
        total_invites: count(invites.id),
        total_uses: sum(invites.uses),
        active_uses: count(sql`CASE WHEN ${inviteUsages.isActive} = true THEN 1 END`),
      })
      .from(invites)
      .leftJoin(inviteUsages, eq(invites.id, inviteUsages.inviteId))
      .groupBy(invites.creatorId)
      .orderBy(desc(sum(invites.uses)))
      .limit(limit);

    return results.map(result => ({
      creator_id: result.creator_id,
      total_invites: Number(result.total_invites),
      total_uses: Number(result.total_uses) || 0,
      active_uses: Number(result.active_uses) || 0,
    }));
  }

  async getAllInvitesForAdmin(): Promise<AdminInviteInfo[]> {
    const results = await db
      .select({
        id: invites.id,
        creatorId: invites.creatorId,
        code: invites.code,
        uses: invites.uses,
        maxUses: invites.maxUses,
        expiresAt: invites.expiresAt,
        createdAt: invites.createdAt,
        channelId: invites.channelId,
        activeUses: count(sql`CASE WHEN ${inviteUsages.isActive} = true THEN 1 END`),
      })
      .from(invites)
      .leftJoin(inviteUsages, eq(invites.id, inviteUsages.inviteId))
      .groupBy(
        invites.id,
        invites.creatorId,
        invites.code,
        invites.uses,
        invites.maxUses,
        invites.expiresAt,
        invites.createdAt,
        invites.channelId
      )
      .orderBy(desc(invites.createdAt));

    return results.map(invite => ({
      id: invite.id,
      creatorId: invite.creatorId,
      code: invite.code,
      uses: invite.uses,
      activeUses: Number(invite.activeUses) || 0,
      maxUses: invite.maxUses || undefined,
      expiresAt: invite.expiresAt || undefined,
      createdAt: invite.createdAt,
      channelId: invite.channelId,
    }));
  }

  async getInviteDetails(inviteCode: string) {
    const invite = await this.getInviteByCode(inviteCode);
    if (!invite) return null;

    const usages = await this.getInviteUsages(invite.id);

    return {
      invite,
      usages,
    };
  }

  async getInviteWithUsagesRelation(inviteId: string) {
    try {
      const result = await db.query.invites.findFirst({
        where: eq(invites.id, inviteId),
        with: {
          usages: true,
        },
      });

      if (!result) return null;

      return {
        invite: {
          id: result.id,
          creatorId: result.creatorId,
          code: result.code,
          uses: result.uses,
          maxUses: result.maxUses || undefined,
          expiresAt: result.expiresAt || undefined,
          createdAt: result.createdAt,
          channelId: result.channelId,
        },
        usages: result.usages.map(usage => ({
          id: usage.id,
          inviteId: usage.inviteId,
          userId: usage.userId,
          joinedAt: usage.joinedAt,
          leftAt: usage.leftAt || undefined,
          isActive: usage.isActive,
        })),
      };
    } catch (error) {
      console.error('Error fetching invite with usages relation:', error);
      // Fallback to original method if relation query fails
      return this.getInviteDetails(inviteId);
    }
  }

  async getUserInvitesWithUsages(userId: string) {
    try {
      const results = await db.query.invites.findMany({
        where: eq(invites.creatorId, userId),
        with: {
          usages: {
            where: eq(inviteUsages.isActive, true),
          },
        },
      });

      return results.map(invite => ({
        invite: {
          id: invite.id,
          creatorId: invite.creatorId,
          code: invite.code,
          uses: invite.uses,
          maxUses: invite.maxUses || undefined,
          expiresAt: invite.expiresAt || undefined,
          createdAt: invite.createdAt,
          channelId: invite.channelId,
        },
        activeUsages: invite.usages.map(usage => ({
          id: usage.id,
          inviteId: usage.inviteId,
          userId: usage.userId,
          joinedAt: usage.joinedAt,
          leftAt: usage.leftAt || undefined,
          isActive: usage.isActive,
        })),
      }));
    } catch (error) {
      console.error('Error fetching user invites with usages:', error);
      // Fallback to original method if relation query fails
      const inviteResults = await this.getUserInvites(userId);
      return inviteResults.map(invite => ({
        invite,
        activeUsages: [],
      }));
    }
  }

  close() {
    // Drizzle with postgres.js handles connection pooling automatically
    // No explicit close needed for normal operations
  }
}
