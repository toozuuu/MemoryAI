import { DatabaseSync } from 'node:sqlite';
import {
  Memory,
  MemoryFilter,
  MemorySearchResult,
  MemoryStatus,
  MemoryScope,
  MemoryType,
  MemoryPrivacyLevel,
  SessionHandoff,
  MemoryShareRecord,
  EmbeddingMetadata,
  VerificationState,
  MemoryAIEvent,
  MemoryTask,
  MemoryVersion,
  MemorySnapshot,
  MemoryReviewItem,
  MemoryConflictRecord,
  MemoryDelegation,
  SyncQueueItem
} from '@sachin97317/types';
import fs from 'node:fs';
import path from 'node:path';

export interface SqliteStorageOptions {
  dbPath?: string; // ':memory:' or file path
  encryptionKey?: string;
}

export class SqliteMemoryStorage {
  private db: DatabaseSync;
  private dbPath: string;

  constructor(options: SqliteStorageOptions = {}) {
    this.dbPath = options.dbPath || ':memory:';
    if (this.dbPath !== ':memory:') {
      const dir = path.dirname(this.dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
    this.db = new DatabaseSync(this.dbPath);
    this.initSchema();
  }

  private initSchema(): void {
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS memories (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        organization_id TEXT,
        user_id TEXT NOT NULL,
        scope TEXT NOT NULL,
        project_id TEXT,
        namespace TEXT,
        type TEXT NOT NULL,
        content TEXT NOT NULL,
        summary TEXT,
        entities TEXT NOT NULL, -- JSON array
        topics TEXT NOT NULL,   -- JSON array
        importance REAL NOT NULL,
        confidence REAL NOT NULL,
        durability REAL DEFAULT 0.5,
        freshness REAL DEFAULT 1.0,
        source_count INTEGER DEFAULT 1,
        verification_state TEXT DEFAULT 'unverified',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        valid_from TEXT,
        valid_to TEXT,
        last_accessed_at TEXT,
        access_count INTEGER NOT NULL DEFAULT 0,
        source_provider TEXT,
        source_client TEXT,
        source_session_id TEXT,
        source_message_id TEXT,
        source_references TEXT, -- JSON array
        update_reason TEXT,
        parent_memory_id TEXT,
        status TEXT NOT NULL,
        privacy_level TEXT NOT NULL,
        content_hash TEXT NOT NULL,
        embedding_reference TEXT
      );
    `);

    // Schema migration guards — add new columns to existing databases before indexes
    this.runMigration(`ALTER TABLE memories ADD COLUMN organization_id TEXT`, 'organization_id');
    this.runMigration(`ALTER TABLE memories ADD COLUMN namespace TEXT`, 'namespace');
    this.runMigration(`ALTER TABLE memories ADD COLUMN durability REAL DEFAULT 0.5`, 'durability');
    this.runMigration(`ALTER TABLE memories ADD COLUMN freshness REAL DEFAULT 1.0`, 'freshness');
    this.runMigration(`ALTER TABLE memories ADD COLUMN source_count INTEGER DEFAULT 1`, 'source_count');
    this.runMigration(`ALTER TABLE memories ADD COLUMN verification_state TEXT DEFAULT 'unverified'`, 'verification_state');
    this.runMigration(`ALTER TABLE memories ADD COLUMN valid_from TEXT`, 'valid_from');
    this.runMigration(`ALTER TABLE memories ADD COLUMN valid_to TEXT`, 'valid_to');
    this.runMigration(`ALTER TABLE memories ADD COLUMN last_accessed_at TEXT`, 'last_accessed_at');
    this.runMigration(`ALTER TABLE memories ADD COLUMN access_count INTEGER DEFAULT 0`, 'access_count');
    this.runMigration(`ALTER TABLE memories ADD COLUMN source_provider TEXT`, 'source_provider');
    this.runMigration(`ALTER TABLE memories ADD COLUMN source_client TEXT`, 'source_client');
    this.runMigration(`ALTER TABLE memories ADD COLUMN source_session_id TEXT`, 'source_session_id');
    this.runMigration(`ALTER TABLE memories ADD COLUMN source_message_id TEXT`, 'source_message_id');
    this.runMigration(`ALTER TABLE memories ADD COLUMN source_references TEXT`, 'source_references');
    this.runMigration(`ALTER TABLE memories ADD COLUMN update_reason TEXT`, 'update_reason');
    this.runMigration(`ALTER TABLE memories ADD COLUMN parent_memory_id TEXT`, 'parent_memory_id');
    this.runMigration(`ALTER TABLE memories ADD COLUMN embedding_reference TEXT`, 'embedding_reference');

    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_memories_tenant_user ON memories(tenant_id, user_id);
      CREATE INDEX IF NOT EXISTS idx_memories_project ON memories(project_id);
      CREATE INDEX IF NOT EXISTS idx_memories_hash ON memories(content_hash);
      CREATE INDEX IF NOT EXISTS idx_memories_status ON memories(status);
      CREATE INDEX IF NOT EXISTS idx_memories_validity ON memories(valid_from, valid_to);
      CREATE INDEX IF NOT EXISTS idx_memories_namespace ON memories(namespace);
      CREATE INDEX IF NOT EXISTS idx_memories_org ON memories(organization_id);

      CREATE VIRTUAL TABLE IF NOT EXISTS memories_fts USING fts5(
        id UNINDEXED,
        content,
        summary,
        entities,
        topics,
        content='memories',
        content_rowid='rowid'
      );

      -- FTS synchronization triggers
      CREATE TRIGGER IF NOT EXISTS memories_ai AFTER INSERT ON memories BEGIN
        INSERT INTO memories_fts(rowid, id, content, summary, entities, topics)
        VALUES (new.rowid, new.id, new.content, new.summary, new.entities, new.topics);
      END;

      CREATE TRIGGER IF NOT EXISTS memories_ad AFTER DELETE ON memories BEGIN
        INSERT INTO memories_fts(memories_fts, rowid, id, content, summary, entities, topics)
        VALUES('delete', old.rowid, old.id, old.content, old.summary, old.entities, old.topics);
      END;

      CREATE TRIGGER IF NOT EXISTS memories_au AFTER UPDATE ON memories BEGIN
        INSERT INTO memories_fts(memories_fts, rowid, id, content, summary, entities, topics)
        VALUES('delete', old.rowid, old.id, old.content, old.summary, old.entities, old.topics);
        INSERT INTO memories_fts(rowid, id, content, summary, entities, topics)
        VALUES (new.rowid, new.id, new.content, new.summary, new.entities, new.topics);
      END;

      CREATE TABLE IF NOT EXISTS vectors (
        id TEXT PRIMARY KEY,
        dimensions INTEGER NOT NULL,
        vector_blob BLOB NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS vectors_shadow (
        id TEXT PRIMARY KEY,
        dimensions INTEGER NOT NULL,
        vector_blob BLOB NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS vectors_backup (
        id TEXT PRIMARY KEY,
        dimensions INTEGER NOT NULL,
        vector_blob BLOB NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS embedding_metadata (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        model TEXT NOT NULL,
        version TEXT NOT NULL,
        dimensions INTEGER NOT NULL,
        distance_metric TEXT NOT NULL,
        created_at TEXT NOT NULL,
        vector_count INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS session_handoffs (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        project_id TEXT NOT NULL,
        session_id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        objective TEXT NOT NULL,
        completed_work TEXT NOT NULL,      -- JSON array
        unfinished_work TEXT NOT NULL,     -- JSON array
        important_decisions TEXT NOT NULL, -- JSON array
        current_architecture TEXT NOT NULL,
        relevant_files TEXT NOT NULL,      -- JSON array
        known_problems TEXT NOT NULL,      -- JSON array
        next_actions TEXT NOT NULL,        -- JSON array
        important_context TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_handoffs_project_user ON session_handoffs(project_id, user_id, created_at);

      CREATE TABLE IF NOT EXISTS memory_shares (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        memory_id TEXT,
        project_id TEXT,
        namespace TEXT,
        target_user_id TEXT,
        target_project_id TEXT,
        target_namespace TEXT,
        permissions TEXT NOT NULL,
        created_at TEXT NOT NULL,
        expires_at TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_shares_target ON memory_shares(target_user_id, target_project_id, target_namespace);

      CREATE TABLE IF NOT EXISTS api_keys (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        key_prefix TEXT NOT NULL,
        key_hash TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT NOT NULL,
        project_id TEXT,
        created_at TEXT NOT NULL,
        expires_at TEXT,
        last_used_at TEXT,
        revoked INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        action TEXT NOT NULL,
        resource_type TEXT NOT NULL,
        resource_id TEXT,
        ip_address TEXT,
        user_agent TEXT,
        status TEXT NOT NULL,
        details TEXT,
        timestamp TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        tenant_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        project_id TEXT,
        namespace TEXT,
        client_id TEXT,
        agent_id TEXT,
        data TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        importance REAL NOT NULL DEFAULT 0.5,
        policy_action TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_events_project_time ON events(project_id, timestamp);

      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        project_id TEXT,
        type TEXT NOT NULL,
        name TEXT NOT NULL,
        status TEXT NOT NULL,
        progress INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        completed_at TEXT,
        result TEXT,
        error TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_tasks_user_status ON tasks(user_id, status);

      CREATE TABLE IF NOT EXISTS memory_versions (
        id TEXT PRIMARY KEY,
        memory_id TEXT NOT NULL,
        version_number INTEGER NOT NULL,
        content TEXT NOT NULL,
        summary TEXT,
        importance REAL NOT NULL,
        confidence REAL NOT NULL,
        entities TEXT NOT NULL,
        topics TEXT NOT NULL,
        changed_by TEXT NOT NULL,
        change_reason TEXT NOT NULL,
        source_evidence TEXT,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_versions_memory ON memory_versions(memory_id, version_number);

      CREATE TABLE IF NOT EXISTS memory_snapshots (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        project_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        memory_count INTEGER NOT NULL,
        state_checksum TEXT NOT NULL,
        created_at TEXT NOT NULL,
        metadata TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_snapshots_project ON memory_snapshots(project_id, created_at);

      CREATE TABLE IF NOT EXISTS review_queue (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        project_id TEXT,
        candidate_content TEXT NOT NULL,
        candidate_type TEXT NOT NULL,
        reason TEXT NOT NULL,
        risk_level TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        reviewed_at TEXT,
        reviewed_by TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_review_status ON review_queue(status, created_at);

      CREATE TABLE IF NOT EXISTS memory_conflicts (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        project_id TEXT NOT NULL,
        topic TEXT NOT NULL,
        source_a TEXT NOT NULL,
        source_b TEXT NOT NULL,
        status TEXT NOT NULL,
        resolution TEXT,
        resolved_at TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_conflicts_project ON memory_conflicts(project_id, status);

      CREATE TABLE IF NOT EXISTS delegations (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        delegator_user_id TEXT NOT NULL,
        target_agent_id TEXT NOT NULL,
        project_id TEXT NOT NULL,
        namespace TEXT,
        permissions TEXT NOT NULL,
        created_at TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        revoked INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS sync_queue (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        operation TEXT NOT NULL,
        version INTEGER NOT NULL DEFAULT 1,
        payload TEXT NOT NULL,
        status TEXT NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
      );
    `);
  }

  private runMigration(sql: string, expectedErrorFragment: string): void {
    try {
      this.db.exec(sql);
    } catch (err: unknown) {
      // Column already exists is expected on existing databases
      const msg = (err as Error).message || '';
      if (!msg.includes('duplicate column') && !msg.includes(expectedErrorFragment)) {
        throw err;
      }
    }
  }


  public insert(memory: Memory): void {
    const stmt = this.db.prepare(`
      INSERT INTO memories (
        id, tenant_id, organization_id, user_id, scope, project_id, namespace, type, content, summary,
        entities, topics, importance, confidence, durability, freshness,
        source_count, verification_state, created_at, updated_at,
        valid_from, valid_to, last_accessed_at, access_count, source_provider,
        source_client, source_session_id, source_message_id, source_references,
        update_reason, parent_memory_id, status, privacy_level, content_hash,
        embedding_reference
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?
      )
    `);

    stmt.run(
      memory.id,
      memory.tenant_id,
      memory.organization_id || null,
      memory.user_id,
      memory.scope,
      memory.project_id || null,
      memory.namespace || null,
      memory.type,
      memory.content,
      memory.summary || null,
      JSON.stringify(memory.entities || []),
      JSON.stringify(memory.topics || []),
      memory.importance,
      memory.confidence,
      memory.durability ?? 0.5,
      memory.freshness ?? 1.0,
      memory.source_count ?? 1,
      memory.verification_state || 'unverified',
      memory.created_at,
      memory.updated_at,
      memory.valid_from || null,
      memory.valid_to || null,
      memory.last_accessed_at || null,
      memory.access_count || 0,
      memory.source_provider || null,
      memory.source_client || null,
      memory.source_session_id || null,
      memory.source_message_id || null,
      JSON.stringify(memory.source_references || []),
      memory.update_reason || null,
      memory.parent_memory_id || null,
      memory.status,
      memory.privacy_level,
      memory.content_hash,
      typeof memory.embedding_reference === 'string'
        ? memory.embedding_reference
        : null
    );
  }

  public getById(id: string): Memory | null {
    const stmt = this.db.prepare(`SELECT * FROM memories WHERE id = ?`);
    const row = stmt.get(id) as Record<string, unknown> | undefined;
    if (!row) return null;
    return this.mapRowToMemory(row);
  }

  public getByContentHash(contentHash: string, filter: Pick<MemoryFilter, 'tenant_id' | 'user_id'> = {}): Memory | null {
    let sql = `SELECT * FROM memories WHERE content_hash = ?`;
    const params: any[] = [contentHash];
    if (filter.tenant_id) { sql += ` AND tenant_id = ?`; params.push(filter.tenant_id); }
    if (filter.user_id) { sql += ` AND user_id = ?`; params.push(filter.user_id); }
    sql += ` AND status NOT IN ('deleted') LIMIT 1`;
    const stmt = this.db.prepare(sql);
    const row = stmt.get(...params) as Record<string, unknown> | undefined;
    if (!row) return null;
    return this.mapRowToMemory(row);
  }


  public update(memory: Memory): void {
    const stmt = this.db.prepare(`
      UPDATE memories SET
        tenant_id = ?, organization_id = ?, user_id = ?, scope = ?, project_id = ?, namespace = ?, type = ?,
        content = ?, summary = ?, entities = ?, topics = ?, importance = ?,
        confidence = ?, durability = ?, freshness = ?, source_count = ?,
        verification_state = ?, updated_at = ?, valid_from = ?, valid_to = ?,
        last_accessed_at = ?, access_count = ?, source_provider = ?,
        source_client = ?, source_session_id = ?, source_message_id = ?,
        source_references = ?, update_reason = ?, parent_memory_id = ?,
        status = ?, privacy_level = ?, content_hash = ?
      WHERE id = ?
    `);

    stmt.run(
      memory.tenant_id,
      memory.organization_id || null,
      memory.user_id,
      memory.scope,
      memory.project_id || null,
      memory.namespace || null,
      memory.type,
      memory.content,
      memory.summary || null,
      JSON.stringify(memory.entities || []),
      JSON.stringify(memory.topics || []),
      memory.importance,
      memory.confidence,
      memory.durability ?? 0.5,
      memory.freshness ?? 1.0,
      memory.source_count ?? 1,
      memory.verification_state || 'unverified',
      memory.updated_at,
      memory.valid_from || null,
      memory.valid_to || null,
      memory.last_accessed_at || null,
      memory.access_count || 0,
      memory.source_provider || null,
      memory.source_client || null,
      memory.source_session_id || null,
      memory.source_message_id || null,
      JSON.stringify(memory.source_references || []),
      memory.update_reason || null,
      memory.parent_memory_id || null,
      memory.status,
      memory.privacy_level,
      memory.content_hash,
      memory.id
    );
  }

  public delete(id: string): void {
    const stmt = this.db.prepare(`DELETE FROM memories WHERE id = ?`);
    stmt.run(id);
    const vecStmt = this.db.prepare(`DELETE FROM vectors WHERE id = ?`);
    vecStmt.run(id);
  }

  public list(filter: MemoryFilter = {}, limit = 50, offset = 0): Memory[] {
    const { clauses, params } = this.buildFilterClauses(filter);
    const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
    const sql = `SELECT * FROM memories ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    const stmt = this.db.prepare(sql);
    const rows = stmt.all(...params, limit, offset) as Record<string, unknown>[];
    return rows.map((r) => this.mapRowToMemory(r));
  }

  public count(filter: MemoryFilter = {}): number {
    const { clauses, params } = this.buildFilterClauses(filter);
    const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
    const sql = `SELECT COUNT(*) as count FROM memories ${whereClause}`;
    const stmt = this.db.prepare(sql);
    const row = stmt.get(...params) as { count: number } | undefined;
    return row ? row.count : 0;
  }

  public searchFts(query: string, filter: MemoryFilter = {}, limit = 50): Array<{ memory: Memory; rank: number }> {
    const STOP_WORDS = new Set([
      'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
      'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
      'to', 'was', 'were', 'will', 'with', 'what', 'which', 'who', 'how',
      'why', 'when', 'where', 'do', 'does', 'did', 'we', 'our', 'you', 'your'
    ]);

    const words = query
      .replace(/['"*?,.!;:()[\]{}]/g, ' ')
      .trim()
      .split(/\s+/)
      .map((w) => w.toLowerCase())
      .filter((w) => w.length > 1 && !STOP_WORDS.has(w));

    const finalWords = words.length > 0 ? words : query.trim().split(/\s+/).filter(Boolean);
    const sanitizedQuery = finalWords.map((w) => `"${w}"*`).join(' OR ');

    if (!sanitizedQuery) {
      return this.list(filter, limit).map((m) => ({ memory: m, rank: 0.5 }));
    }

    const { clauses, params } = this.buildFilterClauses(filter, 'm');
    const filterSql = clauses.length > 0 ? `AND ${clauses.join(' AND ')}` : '';

    try {
      const sql = `
        SELECT m.*, bm25(memories_fts) as rank
        FROM memories_fts
        JOIN memories m ON memories_fts.rowid = m.rowid
        WHERE memories_fts MATCH ? ${filterSql}
        ORDER BY rank ASC
        LIMIT ?
      `;
      const stmt = this.db.prepare(sql);
      const rows = stmt.all(sanitizedQuery, ...params, limit) as (Record<string, unknown> & { rank: number })[];

      return rows.map((r) => {
        const rawRank = typeof r.rank === 'number' ? Math.abs(r.rank) : 1;
        const normalized = 1 / (1 + rawRank);
        return {
          memory: this.mapRowToMemory(r),
          rank: normalized
        };
      });
    } catch {
      return this.list(filter, limit).map((m) => ({ memory: m, rank: 0.5 }));
    }
  }

  // ================= Vector Management =================
  public saveVector(id: string, vector: number[], tableName = 'vectors'): void {
    const buffer = Buffer.from(new Float32Array(vector).buffer);
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO ${tableName} (id, dimensions, vector_blob, updated_at)
      VALUES (?, ?, ?, ?)
    `);
    stmt.run(id, vector.length, buffer, new Date().toISOString());
  }

  public getVectors(ids?: string[], tableName = 'vectors'): Map<string, number[]> {
    const result = new Map<string, number[]>();
    if (ids && ids.length === 0) return result;

    let rows: Array<{ id: string; dimensions: number; vector_blob: Buffer }>;
    if (ids && ids.length > 0) {
      const placeholders = ids.map(() => '?').join(',');
      const stmt = this.db.prepare(`SELECT id, dimensions, vector_blob FROM ${tableName} WHERE id IN (${placeholders})`);
      rows = stmt.all(...ids) as any;
    } else {
      const stmt = this.db.prepare(`SELECT id, dimensions, vector_blob FROM ${tableName}`);
      rows = stmt.all() as any;
    }

    for (const row of rows) {
      const floatArr = new Float32Array(
        row.vector_blob.buffer,
        row.vector_blob.byteOffset,
        row.dimensions
      );
      result.set(row.id, Array.from(floatArr));
    }
    return result;
  }

  public swapVectorTables(): void {
    this.db.exec(`
      DELETE FROM vectors_backup;
      INSERT INTO vectors_backup SELECT * FROM vectors;
      DELETE FROM vectors;
      INSERT INTO vectors SELECT * FROM vectors_shadow;
      DELETE FROM vectors_shadow;
    `);
  }

  public rollbackVectorTables(): void {
    this.db.exec(`
      DELETE FROM vectors;
      INSERT INTO vectors SELECT * FROM vectors_backup;
    `);
  }

  // ================= Embedding Metadata =================
  public saveEmbeddingMetadata(meta: EmbeddingMetadata): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO embedding_metadata (
        id, model, version, dimensions, distance_metric, created_at, vector_count, status
      ) VALUES (1, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      meta.model,
      meta.version,
      meta.dimensions,
      meta.distance_metric,
      meta.created_at,
      meta.vector_count,
      meta.status
    );
  }

  public getEmbeddingMetadata(): EmbeddingMetadata | null {
    const stmt = this.db.prepare(`SELECT * FROM embedding_metadata WHERE id = 1`);
    const row = stmt.get() as Record<string, unknown> | undefined;
    if (!row) return null;
    return {
      model: String(row.model),
      version: String(row.version),
      dimensions: Number(row.dimensions),
      distance_metric: row.distance_metric as any,
      created_at: String(row.created_at),
      vector_count: Number(row.vector_count || 0),
      status: row.status as any
    };
  }

  // ================= Session Handoffs =================
  public insertHandoff(handoff: SessionHandoff): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO session_handoffs (
        id, tenant_id, user_id, project_id, session_id, created_at,
        objective, completed_work, unfinished_work, important_decisions,
        current_architecture, relevant_files, known_problems, next_actions,
        important_context
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      handoff.id,
      handoff.tenant_id,
      handoff.user_id,
      handoff.project_id,
      handoff.session_id,
      handoff.created_at,
      handoff.objective,
      JSON.stringify(handoff.completed_work || []),
      JSON.stringify(handoff.unfinished_work || []),
      JSON.stringify(handoff.important_decisions || []),
      handoff.current_architecture || '',
      JSON.stringify(handoff.relevant_files || []),
      JSON.stringify(handoff.known_problems || []),
      JSON.stringify(handoff.next_actions || []),
      handoff.important_context || ''
    );
  }

  public getLatestHandoff(projectId: string, userId: string): SessionHandoff | null {
    const stmt = this.db.prepare(`
      SELECT * FROM session_handoffs
      WHERE project_id = ? AND user_id = ?
      ORDER BY created_at DESC
      LIMIT 1
    `);
    const row = stmt.get(projectId, userId) as Record<string, unknown> | undefined;
    if (!row) return null;
    return this.mapRowToHandoff(row);
  }

  public getHandoffById(id: string): SessionHandoff | null {
    const stmt = this.db.prepare(`SELECT * FROM session_handoffs WHERE id = ?`);
    const row = stmt.get(id) as Record<string, unknown> | undefined;
    if (!row) return null;
    return this.mapRowToHandoff(row);
  }

  public listHandoffs(projectId?: string, userId?: string, limit = 20): SessionHandoff[] {
    const clauses: string[] = [];
    const params: any[] = [];
    if (projectId) {
      clauses.push('project_id = ?');
      params.push(projectId);
    }
    if (userId) {
      clauses.push('user_id = ?');
      params.push(userId);
    }
    const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
    const stmt = this.db.prepare(`SELECT * FROM session_handoffs ${where} ORDER BY created_at DESC LIMIT ?`);
    const rows = stmt.all(...params, limit) as Record<string, unknown>[];
    return rows.map((r) => this.mapRowToHandoff(r));
  }

  // ================= Memory Shares =================
  public insertShare(share: MemoryShareRecord): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO memory_shares (
        id, tenant_id, user_id, memory_id, project_id, namespace,
        target_user_id, target_project_id, target_namespace, permissions,
        created_at, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      share.id,
      share.tenant_id,
      share.user_id,
      share.memory_id || null,
      share.project_id || null,
      share.namespace || null,
      share.target_user_id || null,
      share.target_project_id || null,
      share.target_namespace || null,
      share.permissions,
      share.created_at,
      share.expires_at || null
    );
  }

  public listShares(filter: { tenant_id?: string; user_id?: string; project_id?: string } = {}): MemoryShareRecord[] {
    const clauses: string[] = [];
    const params: any[] = [];
    if (filter.tenant_id) {
      clauses.push('tenant_id = ?');
      params.push(filter.tenant_id);
    }
    if (filter.user_id) {
      clauses.push('user_id = ?');
      params.push(filter.user_id);
    }
    if (filter.project_id) {
      clauses.push('(project_id = ? OR target_project_id = ?)');
      params.push(filter.project_id, filter.project_id);
    }
    const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
    const stmt = this.db.prepare(`SELECT * FROM memory_shares ${where} ORDER BY created_at DESC`);
    const rows = stmt.all(...params) as Record<string, unknown>[];
    return rows.map((r) => ({
      id: String(r.id),
      tenant_id: String(r.tenant_id),
      user_id: String(r.user_id),
      memory_id: r.memory_id ? String(r.memory_id) : null,
      project_id: r.project_id ? String(r.project_id) : null,
      namespace: r.namespace ? String(r.namespace) : null,
      target_user_id: r.target_user_id ? String(r.target_user_id) : null,
      target_project_id: r.target_project_id ? String(r.target_project_id) : null,
      target_namespace: r.target_namespace ? String(r.target_namespace) : null,
      permissions: r.permissions as any,
      created_at: String(r.created_at),
      expires_at: r.expires_at ? String(r.expires_at) : null
    }));
  }

  private buildFilterClauses(filter: MemoryFilter, tablePrefix = ''): { clauses: string[]; params: any[] } {
    const p = tablePrefix ? `${tablePrefix}.` : '';
    const clauses: string[] = [];
    const params: any[] = [];

    if (filter.tenant_id) {
      clauses.push(`${p}tenant_id = ?`);
      params.push(filter.tenant_id);
    }
    if (filter.organization_id) {
      clauses.push(`${p}organization_id = ?`);
      params.push(filter.organization_id);
    }
    if (filter.user_id) {
      clauses.push(`${p}user_id = ?`);
      params.push(filter.user_id);
    }
    if (filter.project_id !== undefined) {
      if (filter.project_id === null) {
        clauses.push(`${p}project_id IS NULL`);
      } else {
        clauses.push(`(${p}project_id = ? OR ${p}project_id IS NULL)`);
        params.push(filter.project_id);
      }
    }
    if (filter.namespace !== undefined) {
      if (filter.namespace === null) {
        clauses.push(`${p}namespace IS NULL`);
      } else {
        clauses.push(`${p}namespace = ?`);
        params.push(filter.namespace);
      }
    }
    if (filter.statuses && filter.statuses.length > 0) {
      const placeholders = filter.statuses.map(() => '?').join(',');
      clauses.push(`${p}status IN (${placeholders})`);
      params.push(...filter.statuses);
    }
    if (filter.types && filter.types.length > 0) {
      const placeholders = filter.types.map(() => '?').join(',');
      clauses.push(`${p}type IN (${placeholders})`);
      params.push(...filter.types);
    }
    if (filter.valid_at) {
      clauses.push(`(${p}valid_from IS NULL OR ${p}valid_from <= ?) AND (${p}valid_to IS NULL OR ${p}valid_to >= ?)`);
      params.push(filter.valid_at, filter.valid_at);
    }

    return { clauses, params };
  }

  private mapRowToMemory(row: Record<string, unknown>): Memory {
    return {
      id: String(row.id),
      tenant_id: String(row.tenant_id),
      organization_id: row.organization_id ? String(row.organization_id) : null,
      user_id: String(row.user_id),
      scope: row.scope as MemoryScope,
      project_id: row.project_id ? String(row.project_id) : null,
      namespace: row.namespace ? String(row.namespace) : null,
      type: row.type as MemoryType,
      content: String(row.content),
      summary: row.summary ? String(row.summary) : null,
      entities: JSON.parse(String(row.entities || '[]')),
      topics: JSON.parse(String(row.topics || '[]')),
      importance: Number(row.importance),
      confidence: Number(row.confidence),
      durability: row.durability !== null && row.durability !== undefined ? Number(row.durability) : 0.5,
      freshness: row.freshness !== null && row.freshness !== undefined ? Number(row.freshness) : 1.0,
      source_count: row.source_count ? Number(row.source_count) : 1,
      verification_state: (row.verification_state as VerificationState) || 'unverified',
      created_at: String(row.created_at),
      updated_at: String(row.updated_at),
      valid_from: row.valid_from ? String(row.valid_from) : null,
      valid_to: row.valid_to ? String(row.valid_to) : null,
      last_accessed_at: row.last_accessed_at ? String(row.last_accessed_at) : null,
      access_count: Number(row.access_count || 0),
      source_provider: row.source_provider ? String(row.source_provider) : null,
      source_client: row.source_client ? String(row.source_client) : null,
      source_session_id: row.source_session_id ? String(row.source_session_id) : null,
      source_message_id: row.source_message_id ? String(row.source_message_id) : null,
      source_references: JSON.parse(String(row.source_references || '[]')),
      update_reason: row.update_reason ? String(row.update_reason) : null,
      parent_memory_id: row.parent_memory_id ? String(row.parent_memory_id) : null,
      status: row.status as MemoryStatus,
      privacy_level: row.privacy_level as MemoryPrivacyLevel,
      content_hash: String(row.content_hash),
      embedding_reference: row.embedding_reference ? String(row.embedding_reference) : null
    };
  }

  private mapRowToHandoff(row: Record<string, unknown>): SessionHandoff {
    return {
      id: String(row.id),
      tenant_id: String(row.tenant_id),
      user_id: String(row.user_id),
      project_id: String(row.project_id),
      session_id: String(row.session_id),
      created_at: String(row.created_at),
      objective: String(row.objective),
      completed_work: JSON.parse(String(row.completed_work || '[]')),
      unfinished_work: JSON.parse(String(row.unfinished_work || '[]')),
      important_decisions: JSON.parse(String(row.important_decisions || '[]')),
      current_architecture: String(row.current_architecture || ''),
      relevant_files: JSON.parse(String(row.relevant_files || '[]')),
      known_problems: JSON.parse(String(row.known_problems || '[]')),
      next_actions: JSON.parse(String(row.next_actions || '[]')),
      important_context: String(row.important_context || '')
    };
  }

  // ================= Events =================
  public insertEvent(event: MemoryAIEvent): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO events (
        id, type, tenant_id, user_id, project_id, namespace, client_id, agent_id,
        data, timestamp, importance, policy_action
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      event.id,
      event.type,
      event.tenant_id,
      event.user_id,
      event.project_id || null,
      event.namespace || null,
      event.client_id || null,
      event.agent_id || null,
      JSON.stringify(event.data || {}),
      event.timestamp,
      event.importance,
      event.policy_action || null
    );
  }

  public listEvents(filter: { project_id?: string; user_id?: string; limit?: number } = {}): MemoryAIEvent[] {
    const clauses: string[] = [];
    const params: any[] = [];
    if (filter.project_id) {
      clauses.push('project_id = ?');
      params.push(filter.project_id);
    }
    if (filter.user_id) {
      clauses.push('user_id = ?');
      params.push(filter.user_id);
    }
    const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
    const limit = filter.limit || 50;
    const stmt = this.db.prepare(`SELECT * FROM events ${where} ORDER BY timestamp DESC LIMIT ?`);
    const rows = stmt.all(...params, limit) as Record<string, unknown>[];
    return rows.map((r) => ({
      id: String(r.id),
      type: r.type as any,
      tenant_id: String(r.tenant_id),
      user_id: String(r.user_id),
      project_id: r.project_id ? String(r.project_id) : null,
      namespace: r.namespace ? String(r.namespace) : null,
      client_id: r.client_id ? String(r.client_id) : null,
      agent_id: r.agent_id ? String(r.agent_id) : null,
      data: JSON.parse(String(r.data || '{}')),
      timestamp: String(r.timestamp),
      importance: Number(r.importance),
      policy_action: (r.policy_action as any) || undefined
    }));
  }

  // ================= Tasks (MCP 2026 Tasks Extension) =================
  public insertTask(task: MemoryTask): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO tasks (
        id, tenant_id, user_id, project_id, type, name, status, progress,
        created_at, updated_at, completed_at, result, error
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      task.id,
      task.tenant_id,
      task.user_id,
      task.project_id || null,
      task.type,
      task.name,
      task.status,
      task.progress,
      task.created_at,
      task.updated_at,
      task.completed_at || null,
      task.result ? JSON.stringify(task.result) : null,
      task.error || null
    );
  }

  public updateTask(id: string, updates: Partial<MemoryTask>): void {
    const clauses: string[] = ['updated_at = ?'];
    const params: any[] = [new Date().toISOString()];

    if (updates.status !== undefined) {
      clauses.push('status = ?');
      params.push(updates.status);
    }
    if (updates.progress !== undefined) {
      clauses.push('progress = ?');
      params.push(updates.progress);
    }
    if (updates.completed_at !== undefined) {
      clauses.push('completed_at = ?');
      params.push(updates.completed_at);
    }
    if (updates.result !== undefined) {
      clauses.push('result = ?');
      params.push(JSON.stringify(updates.result));
    }
    if (updates.error !== undefined) {
      clauses.push('error = ?');
      params.push(updates.error);
    }

    params.push(id);
    const stmt = this.db.prepare(`UPDATE tasks SET ${clauses.join(', ')} WHERE id = ?`);
    stmt.run(...params);
  }

  public getTaskById(id: string): MemoryTask | null {
    const stmt = this.db.prepare('SELECT * FROM tasks WHERE id = ?');
    const row = stmt.get(id) as Record<string, unknown> | undefined;
    if (!row) return null;
    return {
      id: String(row.id),
      tenant_id: String(row.tenant_id),
      user_id: String(row.user_id),
      project_id: row.project_id ? String(row.project_id) : null,
      type: row.type as any,
      name: String(row.name),
      status: row.status as any,
      progress: Number(row.progress),
      created_at: String(row.created_at),
      updated_at: String(row.updated_at),
      completed_at: row.completed_at ? String(row.completed_at) : null,
      result: row.result ? JSON.parse(String(row.result)) : null,
      error: row.error ? String(row.error) : null
    };
  }

  public listTasks(filter: { user_id?: string; status?: string } = {}): MemoryTask[] {
    const clauses: string[] = [];
    const params: any[] = [];
    if (filter.user_id) {
      clauses.push('user_id = ?');
      params.push(filter.user_id);
    }
    if (filter.status) {
      clauses.push('status = ?');
      params.push(filter.status);
    }
    const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
    const stmt = this.db.prepare(`SELECT * FROM tasks ${where} ORDER BY created_at DESC LIMIT 50`);
    const rows = stmt.all(...params) as Record<string, unknown>[];
    return rows.map((r) => ({
      id: String(r.id),
      tenant_id: String(r.tenant_id),
      user_id: String(r.user_id),
      project_id: r.project_id ? String(r.project_id) : null,
      type: r.type as any,
      name: String(r.name),
      status: r.status as any,
      progress: Number(r.progress),
      created_at: String(r.created_at),
      updated_at: String(r.updated_at),
      completed_at: r.completed_at ? String(r.completed_at) : null,
      result: r.result ? JSON.parse(String(r.result)) : null,
      error: r.error ? String(r.error) : null
    }));
  }

  // ================= Memory Versions =================
  public insertVersion(v: MemoryVersion): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO memory_versions (
        id, memory_id, version_number, content, summary, importance, confidence,
        entities, topics, changed_by, change_reason, source_evidence, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      v.id,
      v.memory_id,
      v.version_number,
      v.content,
      v.summary || null,
      v.importance,
      v.confidence,
      JSON.stringify(v.entities || []),
      JSON.stringify(v.topics || []),
      v.changed_by,
      v.change_reason,
      v.source_evidence || null,
      v.created_at
    );
  }

  public getVersionsByMemoryId(memoryId: string): MemoryVersion[] {
    const stmt = this.db.prepare('SELECT * FROM memory_versions WHERE memory_id = ? ORDER BY version_number ASC');
    const rows = stmt.all(memoryId) as Record<string, unknown>[];
    return rows.map((r) => ({
      id: String(r.id),
      memory_id: String(r.memory_id),
      version_number: Number(r.version_number),
      content: String(r.content),
      summary: r.summary ? String(r.summary) : null,
      importance: Number(r.importance),
      confidence: Number(r.confidence),
      entities: JSON.parse(String(r.entities || '[]')),
      topics: JSON.parse(String(r.topics || '[]')),
      changed_by: String(r.changed_by),
      change_reason: String(r.change_reason),
      source_evidence: r.source_evidence ? String(r.source_evidence) : null,
      created_at: String(r.created_at)
    }));
  }

  // ================= Snapshots =================
  public insertSnapshot(s: MemorySnapshot): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO memory_snapshots (
        id, tenant_id, user_id, project_id, name, description,
        memory_count, state_checksum, created_at, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      s.id,
      s.tenant_id,
      s.user_id,
      s.project_id,
      s.name,
      s.description,
      s.memory_count,
      s.state_checksum,
      s.created_at,
      s.metadata ? JSON.stringify(s.metadata) : null
    );
  }

  public getSnapshotById(id: string): MemorySnapshot | null {
    const stmt = this.db.prepare('SELECT * FROM memory_snapshots WHERE id = ?');
    const row = stmt.get(id) as Record<string, unknown> | undefined;
    if (!row) return null;
    return {
      id: String(row.id),
      tenant_id: String(row.tenant_id),
      user_id: String(row.user_id),
      project_id: String(row.project_id),
      name: String(row.name),
      description: String(row.description),
      memory_count: Number(row.memory_count),
      state_checksum: String(row.state_checksum),
      created_at: String(row.created_at),
      metadata: row.metadata ? JSON.parse(String(row.metadata)) : undefined
    };
  }

  public listSnapshots(projectId: string): MemorySnapshot[] {
    const stmt = this.db.prepare('SELECT * FROM memory_snapshots WHERE project_id = ? ORDER BY created_at DESC');
    const rows = stmt.all(projectId) as Record<string, unknown>[];
    return rows.map((r) => ({
      id: String(r.id),
      tenant_id: String(r.tenant_id),
      user_id: String(r.user_id),
      project_id: String(r.project_id),
      name: String(r.name),
      description: String(r.description),
      memory_count: Number(r.memory_count),
      state_checksum: String(r.state_checksum),
      created_at: String(r.created_at),
      metadata: r.metadata ? JSON.parse(String(r.metadata)) : undefined
    }));
  }

  public deleteSnapshot(id: string): boolean {
    const stmt = this.db.prepare('DELETE FROM memory_snapshots WHERE id = ?');
    stmt.run(id);
    return true;
  }

  // ================= Review Queue =================
  public insertReviewItem(item: MemoryReviewItem): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO review_queue (
        id, tenant_id, user_id, project_id, candidate_content, candidate_type,
        reason, risk_level, status, created_at, reviewed_at, reviewed_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      item.id,
      item.tenant_id,
      item.user_id,
      item.project_id || null,
      item.candidate_content,
      item.candidate_type,
      item.reason,
      item.risk_level,
      item.status,
      item.created_at,
      item.reviewed_at || null,
      item.reviewed_by || null
    );
  }

  public updateReviewItemStatus(id: string, status: 'approved' | 'rejected', reviewedBy?: string): void {
    const stmt = this.db.prepare(`
      UPDATE review_queue SET status = ?, reviewed_at = ?, reviewed_by = ? WHERE id = ?
    `);
    stmt.run(status, new Date().toISOString(), reviewedBy || 'admin', id);
  }

  public listReviewItems(filter: { status?: string; project_id?: string } = {}): MemoryReviewItem[] {
    const clauses: string[] = [];
    const params: any[] = [];
    if (filter.status) {
      clauses.push('status = ?');
      params.push(filter.status);
    }
    if (filter.project_id) {
      clauses.push('project_id = ?');
      params.push(filter.project_id);
    }
    const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
    const stmt = this.db.prepare(`SELECT * FROM review_queue ${where} ORDER BY created_at DESC LIMIT 50`);
    const rows = stmt.all(...params) as Record<string, unknown>[];
    return rows.map((r) => ({
      id: String(r.id),
      tenant_id: String(r.tenant_id),
      user_id: String(r.user_id),
      project_id: r.project_id ? String(r.project_id) : null,
      candidate_content: String(r.candidate_content),
      candidate_type: r.candidate_type as any,
      reason: String(r.reason),
      risk_level: r.risk_level as any,
      status: r.status as any,
      created_at: String(r.created_at),
      reviewed_at: r.reviewed_at ? String(r.reviewed_at) : undefined,
      reviewed_by: r.reviewed_by ? String(r.reviewed_by) : undefined
    }));
  }

  // ================= Conflicts =================
  public insertConflict(c: MemoryConflictRecord): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO memory_conflicts (
        id, tenant_id, project_id, topic, source_a, source_b, status, resolution, resolved_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      c.id,
      c.tenant_id,
      c.project_id,
      c.topic,
      JSON.stringify(c.source_a),
      JSON.stringify(c.source_b),
      c.status,
      c.resolution || null,
      c.resolved_at || null
    );
  }

  public updateConflictStatus(id: string, status: 'resolved' | 'ignored', resolution?: string): void {
    const stmt = this.db.prepare(`
      UPDATE memory_conflicts SET status = ?, resolution = ?, resolved_at = ? WHERE id = ?
    `);
    stmt.run(status, resolution || null, new Date().toISOString(), id);
  }

  public listConflicts(projectId: string): MemoryConflictRecord[] {
    const stmt = this.db.prepare('SELECT * FROM memory_conflicts WHERE project_id = ? ORDER BY id DESC');
    const rows = stmt.all(projectId) as Record<string, unknown>[];
    return rows.map((r) => ({
      id: String(r.id),
      tenant_id: String(r.tenant_id),
      project_id: String(r.project_id),
      topic: String(r.topic),
      source_a: JSON.parse(String(r.source_a)),
      source_b: JSON.parse(String(r.source_b)),
      status: r.status as any,
      resolution: r.resolution ? String(r.resolution) : undefined,
      resolved_at: r.resolved_at ? String(r.resolved_at) : undefined
    }));
  }

  // ================= Delegations =================
  public insertDelegation(d: MemoryDelegation): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO delegations (
        id, tenant_id, delegator_user_id, target_agent_id, project_id,
        namespace, permissions, created_at, expires_at, revoked
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      d.id,
      d.tenant_id,
      d.delegator_user_id,
      d.target_agent_id,
      d.project_id,
      d.namespace || null,
      JSON.stringify(d.permissions),
      d.created_at,
      d.expires_at,
      d.revoked ? 1 : 0
    );
  }

  public getDelegation(id: string): MemoryDelegation | null {
    const stmt = this.db.prepare('SELECT * FROM delegations WHERE id = ?');
    const row = stmt.get(id) as Record<string, unknown> | undefined;
    if (!row) return null;
    return {
      id: String(row.id),
      tenant_id: String(row.tenant_id),
      delegator_user_id: String(row.delegator_user_id),
      target_agent_id: String(row.target_agent_id),
      project_id: String(row.project_id),
      namespace: row.namespace ? String(row.namespace) : null,
      permissions: JSON.parse(String(row.permissions || '[]')),
      created_at: String(row.created_at),
      expires_at: String(row.expires_at),
      revoked: Boolean(row.revoked)
    };
  }

  public listDelegations(agentId: string, projectId: string): MemoryDelegation[] {
    const stmt = this.db.prepare('SELECT * FROM delegations WHERE target_agent_id = ? AND project_id = ? AND revoked = 0');
    const rows = stmt.all(agentId, projectId) as Record<string, unknown>[];
    return rows.map((r) => ({
      id: String(r.id),
      tenant_id: String(r.tenant_id),
      delegator_user_id: String(r.delegator_user_id),
      target_agent_id: String(r.target_agent_id),
      project_id: String(r.project_id),
      namespace: r.namespace ? String(r.namespace) : null,
      permissions: JSON.parse(String(r.permissions || '[]')),
      created_at: String(r.created_at),
      expires_at: String(r.expires_at),
      revoked: Boolean(r.revoked)
    }));
  }

  // ================= Sync Queue =================
  public insertSyncItem(item: SyncQueueItem): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO sync_queue (
        id, tenant_id, entity_type, entity_id, operation, version,
        payload, status, attempts, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      item.id,
      item.tenant_id,
      item.entity_type,
      item.entity_id,
      item.operation,
      item.version,
      JSON.stringify(item.payload),
      item.status,
      item.attempts,
      item.created_at
    );
  }

  public updateSyncItemStatus(id: string, status: 'pending' | 'sent' | 'acknowledged' | 'conflicted' | 'failed'): void {
    const stmt = this.db.prepare('UPDATE sync_queue SET status = ?, attempts = attempts + 1 WHERE id = ?');
    stmt.run(status, id);
  }

  public listPendingSyncItems(): SyncQueueItem[] {
    const stmt = this.db.prepare("SELECT * FROM sync_queue WHERE status = 'pending' ORDER BY created_at ASC LIMIT 100");
    const rows = stmt.all() as Record<string, unknown>[];
    return rows.map((r) => ({
      id: String(r.id),
      tenant_id: String(r.tenant_id),
      entity_type: r.entity_type as any,
      entity_id: String(r.entity_id),
      operation: r.operation as any,
      version: Number(r.version),
      payload: JSON.parse(String(r.payload || '{}')),
      status: r.status as any,
      attempts: Number(r.attempts),
      created_at: String(r.created_at)
    }));
  }

  public close(): void {
    this.db.close();
  }
}
