import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
export class SqliteMemoryStorage {
    db;
    dbPath;
    constructor(options = {}) {
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
    initSchema() {
        this.db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS memories (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        scope TEXT NOT NULL,
        project_id TEXT,
        type TEXT NOT NULL,
        content TEXT NOT NULL,
        summary TEXT,
        entities TEXT NOT NULL, -- JSON array
        topics TEXT NOT NULL,   -- JSON array
        importance REAL NOT NULL,
        confidence REAL NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        valid_from TEXT,
        valid_to TEXT,
        last_accessed_at TEXT,
        access_count INTEGER NOT NULL DEFAULT 0,
        source_provider TEXT,
        source_session_id TEXT,
        source_message_id TEXT,
        parent_memory_id TEXT,
        status TEXT NOT NULL,
        privacy_level TEXT NOT NULL,
        content_hash TEXT NOT NULL,
        embedding_reference TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_memories_tenant_user ON memories(tenant_id, user_id);
      CREATE INDEX IF NOT EXISTS idx_memories_project ON memories(project_id);
      CREATE INDEX IF NOT EXISTS idx_memories_hash ON memories(content_hash);
      CREATE INDEX IF NOT EXISTS idx_memories_status ON memories(status);
      CREATE INDEX IF NOT EXISTS idx_memories_validity ON memories(valid_from, valid_to);

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
    `);
    }
    insert(memory) {
        const stmt = this.db.prepare(`
      INSERT INTO memories (
        id, tenant_id, user_id, scope, project_id, type, content, summary,
        entities, topics, importance, confidence, created_at, updated_at,
        valid_from, valid_to, last_accessed_at, access_count, source_provider,
        source_session_id, source_message_id, parent_memory_id, status,
        privacy_level, content_hash, embedding_reference
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?
      )
    `);
        stmt.run(memory.id, memory.tenant_id, memory.user_id, memory.scope, memory.project_id || null, memory.type, memory.content, memory.summary || null, JSON.stringify(memory.entities || []), JSON.stringify(memory.topics || []), memory.importance, memory.confidence, memory.created_at, memory.updated_at, memory.valid_from || null, memory.valid_to || null, memory.last_accessed_at || null, memory.access_count || 0, memory.source_provider || null, memory.source_session_id || null, memory.source_message_id || null, memory.parent_memory_id || null, memory.status, memory.privacy_level, memory.content_hash, typeof memory.embedding_reference === 'string'
            ? memory.embedding_reference
            : null);
    }
    getById(id) {
        const stmt = this.db.prepare(`SELECT * FROM memories WHERE id = ?`);
        const row = stmt.get(id);
        if (!row)
            return null;
        return this.mapRowToMemory(row);
    }
    update(memory) {
        const stmt = this.db.prepare(`
      UPDATE memories SET
        tenant_id = ?, user_id = ?, scope = ?, project_id = ?, type = ?,
        content = ?, summary = ?, entities = ?, topics = ?, importance = ?,
        confidence = ?, updated_at = ?, valid_from = ?, valid_to = ?,
        last_accessed_at = ?, access_count = ?, source_provider = ?,
        source_session_id = ?, source_message_id = ?, parent_memory_id = ?,
        status = ?, privacy_level = ?, content_hash = ?
      WHERE id = ?
    `);
        stmt.run(memory.tenant_id, memory.user_id, memory.scope, memory.project_id || null, memory.type, memory.content, memory.summary || null, JSON.stringify(memory.entities || []), JSON.stringify(memory.topics || []), memory.importance, memory.confidence, memory.updated_at, memory.valid_from || null, memory.valid_to || null, memory.last_accessed_at || null, memory.access_count || 0, memory.source_provider || null, memory.source_session_id || null, memory.source_message_id || null, memory.parent_memory_id || null, memory.status, memory.privacy_level, memory.content_hash, memory.id);
    }
    delete(id) {
        const stmt = this.db.prepare(`DELETE FROM memories WHERE id = ?`);
        stmt.run(id);
        const vecStmt = this.db.prepare(`DELETE FROM vectors WHERE id = ?`);
        vecStmt.run(id);
    }
    list(filter = {}, limit = 50, offset = 0) {
        const { clauses, params } = this.buildFilterClauses(filter);
        const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
        const sql = `SELECT * FROM memories ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`;
        const stmt = this.db.prepare(sql);
        const rows = stmt.all(...params, limit, offset);
        return rows.map((r) => this.mapRowToMemory(r));
    }
    count(filter = {}) {
        const { clauses, params } = this.buildFilterClauses(filter);
        const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
        const sql = `SELECT COUNT(*) as count FROM memories ${whereClause}`;
        const stmt = this.db.prepare(sql);
        const row = stmt.get(...params);
        return row ? row.count : 0;
    }
    searchFts(query, filter = {}, limit = 50) {
        // Sanitize query for FTS5 syntax
        const sanitizedQuery = query
            .replace(/['"*]/g, '')
            .trim()
            .split(/\s+/)
            .filter((w) => w.length > 0)
            .map((w) => `"${w}"*`)
            .join(' OR ');
        if (!sanitizedQuery) {
            return this.list(filter, limit).map((m) => ({ memory: m, rank: 0.5 }));
        }
        const { clauses, params } = this.buildFilterClauses(filter, 'm');
        const filterSql = clauses.length > 0 ? `AND ${clauses.join(' AND ')}` : '';
        try {
            const sql = `
        SELECT m.*, bm25(memories_fts) as rank
        FROM memories_fts
        JOIN memories m ON memories_fts.id = m.id
        WHERE memories_fts MATCH ? ${filterSql}
        ORDER BY rank ASC
        LIMIT ?
      `;
            const stmt = this.db.prepare(sql);
            const rows = stmt.all(sanitizedQuery, ...params, limit);
            return rows.map((r) => {
                // BM25 is negative/lower is better in SQLite fts5, normalize to 0..1
                const rawRank = typeof r.rank === 'number' ? Math.abs(r.rank) : 1;
                const normalized = 1 / (1 + rawRank);
                return {
                    memory: this.mapRowToMemory(r),
                    rank: normalized
                };
            });
        }
        catch {
            // Fallback to LIKE if FTS parsing fails
            return this.list(filter, limit).map((m) => ({ memory: m, rank: 0.5 }));
        }
    }
    saveVector(id, vector) {
        const buffer = Buffer.from(new Float32Array(vector).buffer);
        const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO vectors (id, dimensions, vector_blob, updated_at)
      VALUES (?, ?, ?, ?)
    `);
        stmt.run(id, vector.length, buffer, new Date().toISOString());
    }
    getVectors(ids) {
        const result = new Map();
        if (ids && ids.length === 0)
            return result;
        let rows;
        if (ids && ids.length > 0) {
            const placeholders = ids.map(() => '?').join(',');
            const stmt = this.db.prepare(`SELECT id, dimensions, vector_blob FROM vectors WHERE id IN (${placeholders})`);
            rows = stmt.all(...ids);
        }
        else {
            const stmt = this.db.prepare(`SELECT id, dimensions, vector_blob FROM vectors`);
            rows = stmt.all();
        }
        for (const row of rows) {
            const floatArr = new Float32Array(row.vector_blob.buffer, row.vector_blob.byteOffset, row.dimensions);
            result.set(row.id, Array.from(floatArr));
        }
        return result;
    }
    buildFilterClauses(filter, tablePrefix = '') {
        const p = tablePrefix ? `${tablePrefix}.` : '';
        const clauses = [];
        const params = [];
        if (filter.tenant_id) {
            clauses.push(`${p}tenant_id = ?`);
            params.push(filter.tenant_id);
        }
        if (filter.user_id) {
            clauses.push(`${p}user_id = ?`);
            params.push(filter.user_id);
        }
        if (filter.project_id !== undefined) {
            if (filter.project_id === null) {
                clauses.push(`${p}project_id IS NULL`);
            }
            else {
                clauses.push(`${p}project_id = ?`);
                params.push(filter.project_id);
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
    mapRowToMemory(row) {
        return {
            id: String(row.id),
            tenant_id: String(row.tenant_id),
            user_id: String(row.user_id),
            scope: row.scope,
            project_id: row.project_id ? String(row.project_id) : null,
            type: row.type,
            content: String(row.content),
            summary: row.summary ? String(row.summary) : null,
            entities: JSON.parse(String(row.entities || '[]')),
            topics: JSON.parse(String(row.topics || '[]')),
            importance: Number(row.importance),
            confidence: Number(row.confidence),
            created_at: String(row.created_at),
            updated_at: String(row.updated_at),
            valid_from: row.valid_from ? String(row.valid_from) : null,
            valid_to: row.valid_to ? String(row.valid_to) : null,
            last_accessed_at: row.last_accessed_at ? String(row.last_accessed_at) : null,
            access_count: Number(row.access_count || 0),
            source_provider: row.source_provider ? String(row.source_provider) : null,
            source_session_id: row.source_session_id ? String(row.source_session_id) : null,
            source_message_id: row.source_message_id ? String(row.source_message_id) : null,
            parent_memory_id: row.parent_memory_id ? String(row.parent_memory_id) : null,
            status: row.status,
            privacy_level: row.privacy_level,
            content_hash: String(row.content_hash),
            embedding_reference: row.embedding_reference ? String(row.embedding_reference) : null
        };
    }
    close() {
        this.db.close();
    }
}
//# sourceMappingURL=sqlite-storage.js.map