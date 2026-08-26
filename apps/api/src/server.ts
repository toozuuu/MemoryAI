import Fastify, { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { MemoryEngine } from '@sachin97317/core';
import {
  AuthUser,
  CreateMemoryInputSchema,
  RecallRequestSchema,
  SearchQuerySchema,
  UpdateMemoryInputSchema
} from '@sachin97317/types';
import {
  RateLimiter,
  AuditLogger,
  authorizeMemoryAccess,
  assertTenantAccess,
  assertUserAccess
} from '@sachin97317/security';
import { logger, metrics, healthService } from '@sachin97317/observability';
import { createMemoryPack, unpackMemoryPack } from '@sachin97317/storage-memory-format';
import { rerankMemories } from '@sachin97317/reranking';

export interface ApiServerOptions {
  engine?: MemoryEngine;
  port?: number;
  host?: string;
  corsOrigins?: string[];
  requireAuth?: boolean;
}

export function buildServer(options: ApiServerOptions = {}): FastifyInstance {
  const server = Fastify({
    logger: false,
    bodyLimit: 10 * 1024 * 1024 // 10MB limit
  });

  const engine = options.engine || new MemoryEngine();
  const rateLimiter = new RateLimiter({ maxRequests: 200, windowMs: 60000 });
  const auditLogger = new AuditLogger();

  // Register Security Plugins
  server.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"]
      }
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  });

  const allowedOrigins = options.corsOrigins ||
    (process.env.MEMORYAI_ALLOWED_ORIGINS ? process.env.MEMORYAI_ALLOWED_ORIGINS.split(',') : ['http://localhost:4200', 'http://localhost:3000']);

  server.register(cors, {
    origin: allowedOrigins.includes('*') ? true : allowedOrigins,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true
  });

  // Global Rate Limiting & Auth Hook
  server.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    const clientIp = request.ip || '127.0.0.1';
    const rateCheck = rateLimiter.isAllowed(clientIp);

    reply.header('X-RateLimit-Remaining', rateCheck.remaining);
    if (!rateCheck.allowed) {
      metrics.recordSecurityEvent();
      reply.status(429).send({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Please retry in a few moments.',
        retryAfterMs: rateCheck.resetMs
      });
      return;
    }

    // Resolve AuthUser
    const apiKey = (request.headers['x-api-key'] as string) || '';
    const authHeader = (request.headers['authorization'] as string) || '';
    const token = authHeader.replace(/^Bearer\s+/i, '');

    const tenantId = (request.headers['x-tenant-id'] as string) || 'default';
    const userId = (request.headers['x-user-id'] as string) || 'default-user';

    // Set authenticated user context
    (request as any).user = {
      id: userId,
      tenant_id: tenantId,
      role: 'admin', // default local mode
      created_at: new Date().toISOString()
    } as AuthUser;
  });

  // ================= Health Routes =================
  server.get('/health/live', async (_req, reply) => {
    const live = await healthService.getLiveness();
    return reply.status(200).send(live);
  });

  server.get('/health/ready', async (_req, reply) => {
    const ready = await healthService.getReadiness();
    const statusCode = ready.status === 'healthy' ? 200 : ready.status === 'degraded' ? 200 : 503;
    return reply.status(statusCode).send(ready);
  });

  // ================= Metrics & Token Savings =================
  server.get('/v1/metrics', async (_req, reply) => {
    return reply.send(metrics.getSnapshot());
  });

  // ================= Memory CRUD =================
  server.post('/v1/memories', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user as AuthUser;
    const bodyResult = CreateMemoryInputSchema.safeParse(request.body);

    if (!bodyResult.success) {
      return reply.status(400).send({ error: 'Validation Error', details: bodyResult.error.format() });
    }

    const input = bodyResult.data;
    assertTenantAccess(user, input.tenant_id);
    assertUserAccess(user, input.user_id);

    const result = await engine.remember(
      {
        content: input.content,
        summary: input.summary,
        scope: input.scope,
        type: input.type,
        importance: input.importance,
        confidence: input.confidence,
        entities: input.entities,
        topics: input.topics,
        valid_from: input.valid_from,
        valid_to: input.valid_to,
        source_provider: input.source_provider,
        source_session_id: input.source_session_id,
        source_message_id: input.source_message_id,
        privacy_level: input.privacy_level
      },
      {
        tenant_id: input.tenant_id,
        user_id: input.user_id,
        project_id: input.project_id
      }
    );

    await auditLogger.log({
      tenant_id: input.tenant_id,
      user_id: input.user_id,
      action: 'memory_create',
      resource_type: 'memory',
      resource_id: result.memory?.id,
      status: 'success'
    });

    return reply.status(201).send({
      decision: result.decision,
      memory: result.memory
    });
  });

  server.get('/v1/memories', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user as AuthUser;
    const query = request.query as any;

    const tenant_id = query.tenant_id || user.tenant_id;
    const user_id = query.user_id || user.id;
    const project_id = query.project_id || undefined;
    const limit = query.limit ? Math.min(200, Number(query.limit)) : 50;
    const offset = query.offset ? Number(query.offset) : 0;

    assertTenantAccess(user, tenant_id);
    assertUserAccess(user, user_id);

    const memories = engine.storage.list(
      {
        tenant_id,
        user_id,
        project_id
      },
      limit,
      offset
    );

    const total = engine.storage.count({ tenant_id, user_id, project_id });

    return reply.send({
      total,
      limit,
      offset,
      memories
    });
  });

  server.get('/v1/memories/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user as AuthUser;
    const { id } = request.params as { id: string };

    const mem = engine.storage.getById(id);
    if (!mem) {
      return reply.status(404).send({ error: 'Not Found', message: `Memory ${id} not found` });
    }

    authorizeMemoryAccess(user, mem, 'read');
    return reply.send(mem);
  });

  server.patch('/v1/memories/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user as AuthUser;
    const { id } = request.params as { id: string };

    const mem = engine.storage.getById(id);
    if (!mem) {
      return reply.status(404).send({ error: 'Not Found', message: `Memory ${id} not found` });
    }

    authorizeMemoryAccess(user, mem, 'write');
    const parseRes = UpdateMemoryInputSchema.safeParse(request.body);
    if (!parseRes.success) {
      return reply.status(400).send({ error: 'Validation Error', details: parseRes.error.format() });
    }

    const updates = parseRes.data;
    if (updates.content) mem.content = updates.content;
    if (updates.summary !== undefined) mem.summary = updates.summary || null;
    if (updates.type) mem.type = updates.type;
    if (updates.status) mem.status = updates.status;
    if (updates.importance !== undefined) mem.importance = updates.importance;
    if (updates.confidence !== undefined) mem.confidence = updates.confidence;
    if (updates.entities) mem.entities = updates.entities;
    if (updates.topics) mem.topics = updates.topics;
    if (updates.valid_from !== undefined) mem.valid_from = updates.valid_from;
    if (updates.valid_to !== undefined) mem.valid_to = updates.valid_to;
    if (updates.privacy_level) mem.privacy_level = updates.privacy_level;
    mem.updated_at = new Date().toISOString();

    engine.storage.update(mem);

    await auditLogger.log({
      tenant_id: user.tenant_id,
      user_id: user.id,
      action: 'memory_update',
      resource_type: 'memory',
      resource_id: mem.id,
      status: 'success'
    });

    return reply.send(mem);
  });

  server.delete('/v1/memories/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user as AuthUser;
    const { id } = request.params as { id: string };

    const mem = engine.storage.getById(id);
    if (!mem) {
      return reply.status(404).send({ error: 'Not Found', message: `Memory ${id} not found` });
    }

    authorizeMemoryAccess(user, mem, 'delete');
    engine.storage.delete(id);

    await auditLogger.log({
      tenant_id: user.tenant_id,
      user_id: user.id,
      action: 'memory_delete',
      resource_type: 'memory',
      resource_id: id,
      status: 'success'
    });

    return reply.send({ success: true, message: `Memory ${id} deleted` });
  });

  // ================= Bounded Recall & Context =================
  server.post('/v1/context', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user as AuthUser;
    const parseRes = RecallRequestSchema.safeParse(request.body);

    if (!parseRes.success) {
      return reply.status(400).send({ error: 'Validation Error', details: parseRes.error.format() });
    }

    const req = parseRes.data;
    assertTenantAccess(user, req.tenant_id);
    assertUserAccess(user, req.user_id);

    const result = await engine.recall({
      tenant_id: req.tenant_id,
      user_id: req.user_id,
      query: req.query,
      project_id: req.project_id,
      scope: req.scope,
      maxTokens: req.maxTokens,
      types: req.types,
      includeSuperseded: req.includeSuperseded,
      temporalDate: req.temporalDate
    });

    return reply.send(result);
  });

  // ================= Search =================
  server.post('/v1/search', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user as AuthUser;
    const parseRes = SearchQuerySchema.safeParse(request.body);

    if (!parseRes.success) {
      return reply.status(400).send({ error: 'Validation Error', details: parseRes.error.format() });
    }

    const input = parseRes.data;
    const tenant_id = input.tenant_id || user.tenant_id;
    const user_id = input.user_id || user.id;

    assertTenantAccess(user, tenant_id);
    assertUserAccess(user, user_id);

    const results = await engine.search(
      input.query,
      {
        tenant_id,
        user_id,
        project_id: input.project_id,
        scope: input.scope,
        types: input.type ? [input.type] : undefined,
        statuses: input.status ? [input.status] : undefined,
        valid_at: input.valid_at
      },
      input.limit
    );

    return reply.send({ results });
  });

  // ================= Consolidation =================
  server.post('/v1/consolidate', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user as AuthUser;
    const res = await engine.consolidate({
      tenant_id: user.tenant_id,
      user_id: user.id
    });
    return reply.send(res);
  });

  // ================= Timeline =================
  server.get('/v1/timeline', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user as AuthUser;
    const { entity } = request.query as { entity?: string };

    const timeline = await engine.timeline({
      tenant_id: user.tenant_id,
      user_id: user.id,
      entity
    });

    return reply.send({ timeline });
  });

  // ================= Import & Export (.memorypack) =================
  server.post('/v1/export', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user as AuthUser;
    const memories = engine.storage.list({
      tenant_id: user.tenant_id,
      user_id: user.id
    });

    const packBuffer = await createMemoryPack(memories, {
      tenant_id: user.tenant_id,
      user_id: user.id,
      exported_by: `API user ${user.id}`
    });

    await auditLogger.log({
      tenant_id: user.tenant_id,
      user_id: user.id,
      action: 'memory_export',
      resource_type: 'memorypack',
      status: 'success'
    });

    reply.header('Content-Type', 'application/octet-stream');
    reply.header('Content-Disposition', 'attachment; filename="memories.memorypack"');
    return reply.send(packBuffer);
  });

  server.post('/v1/import', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user as AuthUser;
    const body = request.body as { packBase64?: string };

    if (!body || !body.packBase64) {
      return reply.status(400).send({ error: 'Missing packBase64 parameter in body' });
    }

    const buffer = Buffer.from(body.packBase64, 'base64');
    const pack = await unpackMemoryPack(buffer);

    let importedCount = 0;
    for (const mem of pack.memories) {
      engine.storage.insert({
        ...mem,
        tenant_id: user.tenant_id,
        user_id: user.id
      });
      importedCount++;
    }

    await auditLogger.log({
      tenant_id: user.tenant_id,
      user_id: user.id,
      action: 'memory_import',
      resource_type: 'memorypack',
      status: 'success'
    });

    return reply.send({
      success: true,
      importedCount,
      manifest: pack.manifest
    });
  });

  // ================= Memory Debugger UI & Diagnostics =================
  server.get('/v1/debugger', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user as AuthUser;
    const { query } = request.query as { query?: string };

    if (!query) {
      return reply.send({ message: 'Provide query parameter to run debugger analysis' });
    }

    const ftsMatches = engine.storage.searchFts(
      query,
      { tenant_id: user.tenant_id, user_id: user.id },
      20
    );
    const queryVec = await engine.embeddingProvider.embed(query);
    const vectors = engine.storage.getVectors(ftsMatches.map((m) => m.memory.id));

    const ranked = rerankMemories(
      ftsMatches.map((m) => ({
        memory: m.memory,
        bm25Score: m.rank,
        vectorScore: vectors.has(m.memory.id)
          ? 0.7
          : 0.3
      })),
      { query }
    );

    return reply.send({
      query,
      candidateCount: ftsMatches.length,
      rankedResults: ranked,
      diagnostics: {
        embeddingDimensions: queryVec.length,
        sqliteFtsStatus: 'active'
      }
    });
  });

  return server;
}

export async function startServer(): Promise<void> {
  const port = Number(process.env.PORT || process.env.MEMORYAI_PORT || 3000);
  const host = process.env.HOST || '0.0.0.0';
  const server = buildServer();

  try {
    const address = await server.listen({ port, host });
    logger.info(`MemoryAI API server running at ${address}`);
    console.log(`\x1b[32m✔\x1b[0m MemoryAI API server active at ${address}`);
  } catch (err: unknown) {
    logger.error({ err }, 'Failed to start MemoryAI API server');
    process.exit(1);
  }
}
