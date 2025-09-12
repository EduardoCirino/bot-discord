import { Database } from 'bun:sqlite';
import type { 
  InviteData, 
  InviteUsage, 
  UserStats, 
  AdminInviteInfo, 
  LeaderboardEntry,
  DatabaseResult,
  InviteUsageResult
} from '../types';

export class DatabaseService {
  private db: Database;

  constructor(dbPath: string = './invites.db') {
    this.db = new Database(dbPath);
    this.initTables();
  }

  private initTables() {
    // Create invites table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS invites (
        id TEXT PRIMARY KEY,
        creator_id TEXT NOT NULL,
        code TEXT NOT NULL UNIQUE,
        uses INTEGER DEFAULT 0,
        max_uses INTEGER,
        expires_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        channel_id TEXT NOT NULL
      )
    `);

    // Create invite_usages table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS invite_usages (
        id TEXT PRIMARY KEY,
        invite_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        left_at DATETIME,
        is_active INTEGER DEFAULT 1,
        FOREIGN KEY (invite_id) REFERENCES invites (id),
        UNIQUE(invite_id, user_id)
      )
    `);

    // Add unique constraint to existing tables if it doesn't exist
    this.addConstraintsIfNeeded();
  }

  private addConstraintsIfNeeded() {
    try {
      // Create indexes for better performance
      this.db.run(`CREATE INDEX IF NOT EXISTS idx_invites_creator_id ON invites(creator_id)`);
      this.db.run(`CREATE INDEX IF NOT EXISTS idx_invites_code ON invites(code)`);
      this.db.run(`CREATE INDEX IF NOT EXISTS idx_invite_usages_invite_id ON invite_usages(invite_id)`);
      this.db.run(`CREATE INDEX IF NOT EXISTS idx_invite_usages_user_id ON invite_usages(user_id)`);
      this.db.run(`CREATE INDEX IF NOT EXISTS idx_invite_usages_is_active ON invite_usages(is_active)`);
      

    } catch (error) {
      // Constraints might already exist, log but continue
      console.warn('Some database constraints may already exist:', error);
    }
  }

  // Invite operations
  async createInvite(invite: Omit<InviteData, 'id' | 'uses' | 'createdAt'>) {
    const id = crypto.randomUUID();
    try {
      this.db.run(
        `INSERT INTO invites (id, creator_id, code, max_uses, expires_at, channel_id)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [id, invite.creatorId, invite.code, invite.maxUses || null, invite.expiresAt?.toISOString() || null, invite.channelId]
      );
      return id;
    } catch (error: unknown) {
      const sqliteError = error as { code?: string };
      // Handle UNIQUE constraint violation on code
      if (sqliteError.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        // Check if it's a code conflict
        const existingInvite = await this.getInviteByCode(invite.code);
        if (existingInvite) {
          // If the invite already exists and belongs to the same creator, return the existing ID
          if (existingInvite.creatorId === invite.creatorId) {
            return existingInvite.id;
          } else {
            // If it belongs to a different creator, this is a genuine conflict
            throw new Error(`Invite code '${invite.code}' already exists and belongs to another user`);
          }
        }
        // If no existing invite found, the constraint might be on a different field
        // This shouldn't happen with our current schema, but let's re-throw
        throw new Error(`Unique constraint violation for invite code '${invite.code}'`);
      }
      throw error;
    }
  }

  async getInviteByCode(code: string): Promise<InviteData | null> {
    const result = this.db.query('SELECT * FROM invites WHERE code = ?').get(code) as DatabaseResult | null;
    if (!result) return null;
    
    return {
      id: result.id,
      creatorId: result.creator_id,
      code: result.code,
      uses: result.uses,
      maxUses: result.max_uses || undefined,
      expiresAt: result.expires_at ? new Date(result.expires_at) : undefined,
      createdAt: new Date(result.created_at),
      channelId: result.channel_id
    };
  }

  async incrementInviteUses(inviteId: string) {
    this.db.run('UPDATE invites SET uses = uses + 1 WHERE id = ?', [inviteId]);
  }

  async getUserInvites(userId: string): Promise<InviteData[]> {
    const results = this.db.query('SELECT * FROM invites WHERE creator_id = ?').all(userId) as DatabaseResult[];
    return results.map(result => ({
      id: result.id,
      creatorId: result.creator_id,
      code: result.code,
      uses: result.uses,
      maxUses: result.max_uses || undefined,
      expiresAt: result.expires_at ? new Date(result.expires_at) : undefined,
      createdAt: new Date(result.created_at),
      channelId: result.channel_id
    }));
  }

  // Usage operations
  async recordInviteUsage(inviteId: string, userId: string) {
    // Check if this user has already been recorded for this invite
    const existingUsage = this.db.query(
      'SELECT id, is_active FROM invite_usages WHERE invite_id = ? AND user_id = ?'
    ).get(inviteId, userId) as { id: string; is_active: number } | undefined;

    if (existingUsage) {
      // If user was previously inactive (left), reactivate them
      if (!existingUsage.is_active) {
        this.db.run(
          'UPDATE invite_usages SET is_active = 1, left_at = NULL WHERE id = ?',
          [existingUsage.id]
        );
        // Increment invite uses since user is rejoining
        this.db.run('UPDATE invites SET uses = uses + 1 WHERE id = ?', [inviteId]);
      }
      return existingUsage.id;
    }

    const id = crypto.randomUUID();
    try {
      this.db.run(
        'INSERT INTO invite_usages (id, invite_id, user_id, is_active) VALUES (?, ?, ?, 1)',
        [id, inviteId, userId]
      );
      return id;
    } catch (error: unknown) {
      const sqliteError = error as { code?: string };
      // Handle any other potential constraint violations
      if (sqliteError.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        // Double-check in case of race condition
        const doubleCheck = this.db.query(
          'SELECT id FROM invite_usages WHERE invite_id = ? AND user_id = ?'
        ).get(inviteId, userId) as { id: string } | undefined;
        if (doubleCheck) {
          return doubleCheck.id;
        }
      }
      throw error;
    }
  }

  async getInviteUsages(inviteId: string): Promise<InviteUsage[]> {
    const usages = this.db.query('SELECT * FROM invite_usages WHERE invite_id = ?').all(inviteId) as InviteUsageResult[];
    return usages.map(usage => ({
      id: usage.id,
      inviteId: usage.invite_id,
      userId: usage.user_id,
      joinedAt: new Date(usage.joined_at),
      leftAt: usage.left_at ? new Date(usage.left_at) : undefined,
      isActive: Boolean(usage.is_active)
    }));
  }

  async markUserAsLeft(userId: string) {
    const result = this.db.run(
      'UPDATE invite_usages SET is_active = 0, left_at = CURRENT_TIMESTAMP WHERE user_id = ? AND is_active = 1',
      [userId]
    );

    // Decrement invite uses for each invite this user was active in
    const affectedUsages = this.db.query(
      'SELECT invite_id FROM invite_usages WHERE user_id = ? AND is_active = 0'
    ).all(userId) as { invite_id: string }[];

    for (const usage of affectedUsages) {
      this.db.run('UPDATE invites SET uses = MAX(0, uses - 1) WHERE id = ?', [usage.invite_id]);
    }

    return result.changes > 0;
  }

  async getUserStats(userId: string): Promise<UserStats> {
    const invites = await this.getUserInvites(userId);
    const totalUses = invites.reduce((sum: number, invite: InviteData) => sum + invite.uses, 0);

    // Calculate active uses (users who haven't left)
    const activeUses = await this.getActiveUsesForUser(userId);

    return {
      userId,
      totalInvites: invites.length,
      totalUses,
      activeUses,
      invites
    };
  }

  async getActiveUsesForUser(userId: string) {
    const result = this.db.query(`
      SELECT COUNT(*) as active_count
      FROM invite_usages iu
      JOIN invites i ON iu.invite_id = i.id
      WHERE i.creator_id = ? AND iu.is_active = 1
    `).get(userId) as { active_count: number } | undefined;

    return result?.active_count || 0;
  }

  async getLeaderboard(limit: number = 10): Promise<LeaderboardEntry[]> {
    const results = this.db.query(`
      SELECT
        i.creator_id,
        COUNT(DISTINCT i.id) as total_invites,
        SUM(i.uses) as total_uses,
        COUNT(CASE WHEN iu.is_active = 1 THEN 1 END) as active_uses
      FROM invites i
      LEFT JOIN invite_usages iu ON i.id = iu.invite_id
      GROUP BY i.creator_id
      ORDER BY total_uses DESC
      LIMIT ?
    `).all(limit) as LeaderboardEntry[];

    return results;
  }

  async getAllInvitesForAdmin(): Promise<AdminInviteInfo[]> {
    const invites = this.db.query(`
      SELECT
        i.*,
        COUNT(CASE WHEN iu.is_active = 1 THEN 1 END) as active_uses
      FROM invites i
      LEFT JOIN invite_usages iu ON i.id = iu.invite_id
      GROUP BY i.id
      ORDER BY i.created_at DESC
    `).all() as Array<DatabaseResult & { active_uses: number }>;

    return invites.map(invite => ({
      id: invite.id,
      creatorId: invite.creator_id,
      code: invite.code,
      uses: invite.uses,
      activeUses: invite.active_uses || 0,
      maxUses: invite.max_uses || undefined,
      expiresAt: invite.expires_at ? new Date(invite.expires_at) : undefined,
      createdAt: new Date(invite.created_at),
      channelId: invite.channel_id
    }));
  }

  async getInviteDetails(inviteCode: string) {
    const invite = await this.getInviteByCode(inviteCode);
    if (!invite) return null;

    const usages = await this.getInviteUsages(invite.id);

    return {
      invite,
      usages
    };
  }

  close() {
    this.db.close();
  }
}