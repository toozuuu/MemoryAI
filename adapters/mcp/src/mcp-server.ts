import { MemoryEngine, detectProjectId, EmbeddingMigrator, hashContent } from '@memoryai/core';
import { createMemoryPack, unpackMemoryPack } from '@memoryai/storage-memory-format';
import { metrics } from '@memoryai/observability';
import { shouldRecallMemory, classifyMemoryScope } from '@memoryai/extraction';
import readline from 'node:readline';

export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export const MCP_TOOLS: McpToolDefinition[] = [
  {
    name: 'memory_auto_context',
    description: 'Automatically detect project, evaluate query intent, and recall relevant bounded memory context and session handoff without manual intervention.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'The developer prompt or current task description.' },
        workspacePath: { type: 'string', description: 'Optional current workspace directory path.' },
        userId: { type: 'string', description: 'User identifier (default "default-user").' },
        maxTokens: { type: 'number', description: 'Maximum tokens for bounded context (default 1000).' }
      },
      required: ['query']
    }
  },
  {
    name: 'memory_recall',
    description: 'Retrieve token-bounded relevant memories for the current prompt or task.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'The current topic or task query.' },
        userId: { type: 'string', description: 'User identifier.' },
        projectId: { type: 'string', description: 'Optional project identifier.' },
        workspacePath: { type: 'string', description: 'Workspace path to auto-detect project ID.' },
        maxTokens: { type: 'number', description: 'Maximum tokens to return (default 1000).' }
      },
      required: ['query']
    }
  },
  {
    name: 'memory_remember',
    description: 'Automatically store durable preferences, architectural decisions, facts, or milestones.',
    inputSchema: {
      type: 'object',
      properties: {
        content: { type: 'string', description: 'The durable memory statement.' },
        userId: { type: 'string', description: 'User identifier.' },
        projectId: { type: 'string', description: 'Optional project identifier.' },
        workspacePath: { type: 'string', description: 'Workspace path to auto-detect project.' },
        scope: {
          type: 'string',
          enum: ['user', 'project', 'organization', 'session', 'task', 'global'],
          description: 'Optional explicit scope.'
        },
        type: {
          type: 'string',
          enum: ['preference', 'decision', 'fact', 'project', 'task', 'semantic'],
          description: 'Type of memory.'
        },
        importance: { type: 'number', description: 'Importance rating from 0.0 to 1.0.' }
      },
      required: ['content']
    }
  },
  {
    name: 'memory_handoff_create',
    description: 'Create a structured session handoff object preserving objective, completed work, unfinished work, decisions, and next steps.',
    inputSchema: {
      type: 'object',
      properties: {
        objective: { type: 'string', description: 'Main objective of the session.' },
        completedWork: { type: 'array', items: { type: 'string' }, description: 'Milestones achieved.' },
        unfinishedWork: { type: 'array', items: { type: 'string' }, description: 'Pending tasks.' },
        importantDecisions: { type: 'array', items: { type: 'string' }, description: 'Decisions made.' },
        currentArchitecture: { type: 'string', description: 'Current architecture summary.' },
        relevantFiles: { type: 'array', items: { type: 'string' }, description: 'Key files modified.' },
        nextActions: { type: 'array', items: { type: 'string' }, description: 'Next suggested actions.' },
        projectId: { type: 'string', description: 'Project ID.' },
        workspacePath: { type: 'string', description: 'Workspace path for auto project detection.' }
      },
      required: ['objective']
    }
  },
  {
    name: 'memory_handoff_get',
    description: 'Retrieve the most recent session handoff for the active project.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project identifier.' },
        workspacePath: { type: 'string', description: 'Workspace path to auto-detect project.' }
      }
    }
  },
  {
    name: 'memory_share',
    description: 'Share specific memory, project context, or namespace with another user or project.',
    inputSchema: {
      type: 'object',
      properties: {
        memoryId: { type: 'string', description: 'Optional memory ID to share.' },
        projectId: { type: 'string', description: 'Optional project ID to share.' },
        namespace: { type: 'string', description: 'Optional namespace.' },
        targetUserId: { type: 'string', description: 'Recipient user ID.' },
        targetProjectId: { type: 'string', description: 'Target project ID.' },
        permissions: { type: 'string', enum: ['read', 'write'], description: 'Sharing permissions.' }
      }
    }
  },
  {
    name: 'memory_embeddings_status',
    description: 'Check active embedding model, dimensions, vector count, and migration status.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'memory_update',
    description: 'Update the content or importance of an existing memory.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Memory ID.' },
        content: { type: 'string', description: 'Updated memory content.' },
        importance: { type: 'number', description: 'Updated importance.' }
      },
      required: ['id']
    }
  },
  {
    name: 'memory_search',
    description: 'Search memories with keyword and semantic filtering.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query.' },
        userId: { type: 'string', description: 'User identifier.' },
        projectId: { type: 'string', description: 'Project identifier.' },
        limit: { type: 'number', description: 'Maximum results (default 10).' }
      },
      required: ['query']
    }
  },
  {
    name: 'memory_forget',
    description: 'Permanently remove a memory.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Memory ID to delete.' },
        userId: { type: 'string', description: 'User identifier.' }
      },
      required: ['id']
    }
  },
  {
    name: 'memory_context',
    description: 'Get bounded context for starting an AI assistant session.',
    inputSchema: {
      type: 'object',
      properties: {
        userId: { type: 'string', description: 'User identifier.' },
        projectId: { type: 'string', description: 'Project identifier.' },
        workspacePath: { type: 'string', description: 'Workspace path to auto-detect project ID.' },
        maxTokens: { type: 'number', description: 'Max token budget (default 1000).' }
      }
    }
  },
  {
    name: 'memory_timeline',
    description: 'View chronological evolution of memories for an entity or concept.',
    inputSchema: {
      type: 'object',
      properties: {
        entity: { type: 'string', description: 'Entity or keyword to trace.' },
        userId: { type: 'string', description: 'User identifier.' }
      }
    }
  },
  {
    name: 'memory_export',
    description: 'Export all memories for a user as a base64 encoded .memorypack payload.',
    inputSchema: {
      type: 'object',
      properties: {
        userId: { type: 'string', description: 'User identifier.' }
      }
    }
  },
  {
    name: 'memory_import',
    description: 'Import memories from a base64 encoded .memorypack payload.',
    inputSchema: {
      type: 'object',
      properties: {
        packBase64: { type: 'string', description: 'Base64 encoded .memorypack archive.' },
        userId: { type: 'string', description: 'Target user identifier.' }
      },
      required: ['packBase64']
    }
  },
  {
    name: 'memory_status',
    description: 'Check MemoryAI system status, active project identity, and token savings analytics.',
    inputSchema: {
      type: 'object',
      properties: {
        workspacePath: { type: 'string', description: 'Workspace path to test project identity.' }
      }
    }
  },
  {
    name: 'memory_explain',
    description: 'Explain retrieval results, ranking scores, candidate evaluation, and context bounding breakdown for a query.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'The query to evaluate and explain.' },
        userId: { type: 'string', description: 'User identifier.' },
        projectId: { type: 'string', description: 'Optional project identifier.' },
        workspacePath: { type: 'string', description: 'Workspace path to auto-detect project.' },
        maxTokens: { type: 'number', description: 'Max token budget.' },
        minScore: { type: 'number', description: 'Minimum relevance score cutoff.' }
      },
      required: ['query']
    }
  },
  {
    name: 'memory_metrics',
    description: 'Retrieve detailed system performance metrics, capture quality rates, recall accuracy, and token efficiency statistics.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  // ================= MCP 2026 Tasks Extension =================
  {
    name: 'task_create',
    description: 'Create an asynchronous long-running background task (e.g. embedding_rebuild, consolidation, reindex, integrity_verify).',
    inputSchema: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['embedding_rebuild', 'embedding_migration', 'consolidation', 'reindex', 'import_pack', 'export_pack', 'integrity_verify', 'integrity_repair'],
          description: 'Type of task to execute.'
        },
        name: { type: 'string', description: 'Descriptive name for the background job.' },
        userId: { type: 'string', description: 'User identifier.' },
        projectId: { type: 'string', description: 'Optional project identifier.' }
      },
      required: ['type', 'name']
    }
  },
  {
    name: 'task_get',
    description: 'Poll status, progress (0-100), and result of a long-running task by its explicit taskId handle.',
    inputSchema: {
      type: 'object',
      properties: {
        taskId: { type: 'string', description: 'The explicit taskId handle returned by task_create.' }
      },
      required: ['taskId']
    }
  },
  {
    name: 'task_cancel',
    description: 'Cancel a queued or running background task.',
    inputSchema: {
      type: 'object',
      properties: {
        taskId: { type: 'string', description: 'The explicit taskId handle.' }
      },
      required: ['taskId']
    }
  },
  {
    name: 'task_list',
    description: 'List recent background tasks and their statuses.',
    inputSchema: {
      type: 'object',
      properties: {
        userId: { type: 'string', description: 'User identifier.' },
        status: { type: 'string', description: 'Optional status filter (queued, running, completed, failed, cancelled).' }
      }
    }
  },
  // ================= Progressive Disclosure =================
  {
    name: 'memory_progressive_recall',
    description: 'Retrieve context at a specific progressive disclosure level (summary, canonical, evidence, conversation).',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query or task prompt.' },
        targetLevel: {
          type: 'string',
          enum: ['summary', 'canonical', 'evidence', 'conversation'],
          description: 'Progressive disclosure tier (default: canonical).'
        },
        userId: { type: 'string', description: 'User identifier.' },
        projectId: { type: 'string', description: 'Optional project identifier.' },
        workspacePath: { type: 'string', description: 'Workspace directory.' },
        maxTokens: { type: 'number', description: 'Maximum tokens (default: 1000).' }
      },
      required: ['query']
    }
  },
  // ================= Snapshots & Versions =================
  {
    name: 'memory_snapshot_create',
    description: 'Create a point-in-time state snapshot of all memories for a project.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Name of the snapshot.' },
        description: { type: 'string', description: 'Description or milestone notes.' },
        projectId: { type: 'string', description: 'Project ID.' },
        workspacePath: { type: 'string', description: 'Workspace path to auto-detect project.' }
      },
      required: ['name']
    }
  },
  {
    name: 'memory_snapshot_list',
    description: 'List all memory snapshots for a project.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID.' },
        workspacePath: { type: 'string', description: 'Workspace path.' }
      }
    }
  },
  {
    name: 'memory_snapshot_compare',
    description: 'Compare two memory snapshots and return additions, deletions, and state diff.',
    inputSchema: {
      type: 'object',
      properties: {
        snapshotAId: { type: 'string', description: 'First snapshot ID.' },
        snapshotBId: { type: 'string', description: 'Second snapshot ID.' }
      },
      required: ['snapshotAId', 'snapshotBId']
    }
  },
  {
    name: 'memory_diff',
    description: 'Compute historical diff between two versions of a memory record.',
    inputSchema: {
      type: 'object',
      properties: {
        memoryId: { type: 'string', description: 'Memory ID.' },
        fromVersion: { type: 'number', description: 'Starting version number.' },
        toVersion: { type: 'number', description: 'Target version number.' }
      },
      required: ['memoryId', 'fromVersion', 'toVersion']
    }
  },
  // ================= Health, Review & Diagnostics =================
  {
    name: 'memory_health',
    description: 'Get project memory health score (0-100) with diagnostic breakdown.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project ID.' },
        workspacePath: { type: 'string', description: 'Workspace directory.' }
      }
    }
  },
  {
    name: 'memory_review_queue',
    description: 'Inspect and manage quarantined or flagged memories requiring review.',
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['list', 'approve', 'reject'], description: 'Action to perform.' },
        itemId: { type: 'string', description: 'Review item ID (for approve/reject).' }
      }
    }
  },
  {
    name: 'memory_explain_capture',
    description: 'Explain why a specific conversational statement was or was not remembered.',
    inputSchema: {
      type: 'object',
      properties: {
        content: { type: 'string', description: 'The text to evaluate for durability and usefulness.' }
      },
      required: ['content']
    }
  },
  {
    name: 'memory_event_emit',
    description: 'Emit a raw IDE or client event (session.started, file.changed, decision.created) into the reactive memory pipeline.',
    inputSchema: {
      type: 'object',
      properties: {
        type: { type: 'string', description: 'Event type (e.g. decision.created, architecture.changed).' },
        content: { type: 'string', description: 'Event content or description.' },
        projectId: { type: 'string', description: 'Project ID.' },
        workspacePath: { type: 'string', description: 'Workspace path.' }
      },
      required: ['type']
    }
  }
];

export class McpServer {
  private engine: MemoryEngine;
  private defaultTenantId = 'default';
  private defaultUserId = 'default-user';

  constructor(engine?: MemoryEngine) {
    this.engine = engine || new MemoryEngine();
  }

  public async handleToolCall(name: string, args: Record<string, any> = {}): Promise<any> {
    const tenantId = args.tenantId || this.defaultTenantId;
    const userId = args.userId || this.defaultUserId;

    // Resolve project ID automatically if not explicitly provided
    let projectId = args.projectId || null;
    let projectIdentity = detectProjectId(args.workspacePath);
    if (!projectId && projectIdentity) {
      projectId = projectIdentity.id;
    }

    switch (name) {
      case 'memory_auto_context': {
        const query = args.query || '';
        const intent = shouldRecallMemory(query, { hasActiveProject: Boolean(projectId) });

        if (!intent.shouldRecall) {
          return {
            content: [
              {
                type: 'text',
                text: `[MemoryAI] No historical retrieval needed for this request (${intent.reason}).`
              }
            ],
            shouldRecall: false,
            recalledCount: 0,
            projectName: projectIdentity.name,
            projectId
          };
        }

        const res = await this.engine.recall({
          tenant_id: tenantId,
          user_id: userId,
          query,
          project_id: projectId,
          includeHandoff: true,
          maxTokens: args.maxTokens || 1000
        });

        const handoffNote = res.handoff ? ` + active session handoff` : '';
        const transparencyNote = res.memories.length > 0 || res.handoff
          ? `[MemoryAI: recalled ${res.memories.length} relevant memories${handoffNote} for project ${projectIdentity.name} (${res.tokenCount} tokens)]`
          : `[MemoryAI: no prior memories matched query for project ${projectIdentity.name}]`;

        return {
          content: [
            {
              type: 'text',
              text: `${transparencyNote}\n\n${res.context}`
            }
          ],
          shouldRecall: true,
          tokenCount: res.tokenCount,
          maxTokens: res.maxTokens,
          recalledCount: res.memories.length,
          handoffIncluded: Boolean(res.handoff),
          projectName: projectIdentity.name,
          projectId
        };
      }

      case 'memory_handoff_create': {
        const handoff = await this.engine.createHandoff({
          tenant_id: tenantId,
          user_id: userId,
          project_id: projectId || 'default-project',
          objective: args.objective,
          completed_work: args.completedWork || [],
          unfinished_work: args.unfinishedWork || [],
          important_decisions: args.importantDecisions || [],
          current_architecture: args.currentArchitecture || '',
          relevant_files: args.relevantFiles || [],
          next_actions: args.nextActions || []
        });

        return {
          content: [
            {
              type: 'text',
              text: `[MemoryAI: created session handoff for project ${projectIdentity.name} (ID: ${handoff.id})]`
            }
          ],
          handoffId: handoff.id,
          projectId: handoff.project_id
        };
      }

      case 'memory_handoff_get': {
        const handoff = this.engine.getLatestHandoff(projectId || 'default-project', userId);
        return {
          content: [
            {
              type: 'text',
              text: handoff ? JSON.stringify(handoff, null, 2) : 'No session handoffs found for project.'
            }
          ],
          handoff
        };
      }

      case 'memory_share': {
        const share = await this.engine.shareMemory({
          tenant_id: tenantId,
          user_id: userId,
          memory_id: args.memoryId,
          project_id: args.projectId || (args.memoryId ? undefined : projectId),
          namespace: args.namespace,
          target_user_id: args.targetUserId,
          target_project_id: args.targetProjectId,
          permissions: args.permissions || 'read'
        });

        return {
          content: [
            {
              type: 'text',
              text: `[MemoryAI: scoped share created with ID ${share.id}]`
            }
          ],
          shareId: share.id
        };
      }

      case 'memory_embeddings_status': {
        const migrator = new EmbeddingMigrator(this.engine.storage);
        const status = migrator.getStatus(this.engine.embeddingProvider);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(status, null, 2)
            }
          ],
          status
        };
      }

      case 'memory_recall': {
        const res = await this.engine.recall({
          tenant_id: tenantId,
          user_id: userId,
          query: args.query,
          project_id: projectId,
          maxTokens: args.maxTokens || 1000
        });
        return {
          content: [{ type: 'text', text: res.context }],
          tokenCount: res.tokenCount,
          maxTokens: res.maxTokens,
          memoriesFound: res.memories.length,
          projectId
        };
      }

      case 'memory_remember': {
        const autoScope = args.scope || classifyMemoryScope(args.content);
        const res = await this.engine.remember(
          {
            content: args.content,
            type: args.type || 'semantic',
            scope: autoScope,
            importance: args.importance ?? 0.8
          },
          {
            tenant_id: tenantId,
            user_id: userId,
            project_id: autoScope === 'user' ? null : projectId
          }
        );

        let actionVerb = 'saved';
        if (res.decision.action === 'UPDATE') actionVerb = 'updated';
        else if (res.decision.action === 'CONFLICT' || res.decision.action === 'SUPERSEDE') actionVerb = 'updated (superseded previous)';
        else if (res.decision.action === 'MERGE') actionVerb = 'merged with';
        else if (res.decision.action === 'IGNORE') actionVerb = 'ignored (duplicate or transient)';

        const note = `[MemoryAI: ${actionVerb} ${autoScope} memory${res.memory ? ` (ID: ${res.memory.id})` : ''}]`;

        return {
          content: [{ type: 'text', text: note }],
          action: res.decision.action,
          memoryId: res.memory?.id,
          scope: autoScope,
          projectId: autoScope === 'user' ? null : projectId
        };
      }

      case 'memory_update': {
        const mem = this.engine.storage.getById(args.id);
        if (!mem) throw new Error(`Memory with ID ${args.id} not found`);
        if (mem.tenant_id !== tenantId || mem.user_id !== userId) {
          throw new Error(`Unauthorized update of memory ${args.id}`);
        }
        if (args.content) {
          mem.content = args.content;
          mem.content_hash = hashContent(args.content);
        }
        if (args.importance !== undefined) mem.importance = args.importance;
        mem.updated_at = new Date().toISOString();
        this.engine.storage.update(mem);
        if (args.content) {
          const vec = await this.engine.embeddingProvider.embed(args.content);
          this.engine.storage.saveVector(mem.id, vec);
        }
        return {
          content: [{ type: 'text', text: `[MemoryAI: updated memory ${args.id}]` }],
          memoryId: mem.id
        };
      }

      case 'memory_search': {
        const results = await this.engine.search(
          args.query,
          {
            tenant_id: tenantId,
            user_id: userId,
            project_id: projectId
          },
          args.limit || 10
        );
        const text = results
          .map(
            (r, i) =>
              `${i + 1}. [${(r.score * 100).toFixed(0)}%] (${r.memory.type} | ${r.memory.scope}) ${r.memory.content}`
          )
          .join('\n');
        return {
          content: [{ type: 'text', text: text || 'No memories found.' }],
          count: results.length
        };
      }

      case 'memory_forget': {
        const deleted = await this.engine.forget(args.id, {
          tenant_id: tenantId,
          user_id: userId
        });
        return {
          content: [
            {
              type: 'text',
              text: deleted ? `[MemoryAI: forgotten memory ${args.id}]` : `Memory not found.`
            }
          ]
        };
      }

      case 'memory_context': {
        const res = await this.engine.recall({
          tenant_id: tenantId,
          user_id: userId,
          query: 'current project architecture user preferences decisions',
          project_id: projectId,
          maxTokens: args.maxTokens || 1000
        });
        return {
          content: [{ type: 'text', text: res.context }],
          tokenCount: res.tokenCount,
          projectId
        };
      }

      case 'memory_timeline': {
        const timeline = await this.engine.timeline({
          tenant_id: tenantId,
          user_id: userId,
          entity: args.entity
        });
        const text = timeline
          .map(
            (m) =>
              `[${m.created_at.slice(0, 10)}] (${m.status} | ${m.scope}) ${m.content}${
                m.valid_to ? ` [Superseded at ${m.valid_to.slice(0, 10)}]` : ''
              }`
          )
          .join('\n');
        return {
          content: [{ type: 'text', text: text || 'No timeline records found.' }]
        };
      }

      case 'memory_export': {
        const memories = this.engine.storage.list({
          tenant_id: tenantId,
          user_id: userId
        });
        const packBuffer = await createMemoryPack(memories, {
          tenant_id: tenantId,
          user_id: userId
        });
        return {
          content: [
            {
              type: 'text',
              text: `Exported ${memories.length} memories.`
            }
          ],
          packBase64: packBuffer.toString('base64'),
          count: memories.length
        };
      }

      case 'memory_import': {
        const buffer = Buffer.from(args.packBase64, 'base64');
        const pack = await unpackMemoryPack(buffer);
        let imported = 0;
        let skipped = 0;
        for (const mem of pack.memories) {
          const existing = this.engine.storage.getByContentHash(mem.content_hash, { tenant_id: tenantId, user_id: userId });
          if (existing) {
            skipped++;
            continue;
          }
          this.engine.storage.insert({
            ...mem,
            tenant_id: tenantId,
            user_id: userId
          });
          imported++;
        }
        return {
          content: [
            {
              type: 'text',
              text: `Successfully imported ${imported} memories (${skipped} duplicates skipped) from .memorypack.`
            }
          ],
          importedCount: imported,
          skippedCount: skipped
        };
      }

      case 'memory_status': {
        const snapshot = metrics.getSnapshot();
        const totalMemories = this.engine.storage.count({
          tenant_id: tenantId,
          user_id: userId
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  status: 'healthy',
                  userMemories: totalMemories,
                  detectedProject: projectIdentity,
                  metrics: snapshot
                },
                null,
                2
              )
            }
          ],
          project: projectIdentity
        };
      }

      case 'memory_explain': {
        const breakdown = await this.engine.explain({
          tenant_id: tenantId,
          user_id: userId,
          query: args.query,
          project_id: projectId,
          maxTokens: args.maxTokens || 1000,
          minScore: args.minScore
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(breakdown, null, 2)
            }
          ],
          breakdown
        };
      }

      case 'memory_metrics': {
        const snapshot = metrics.getSnapshot();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(snapshot, null, 2)
            }
          ],
          metrics: snapshot
        };
      }

      // ================= MCP 2026 Tasks Extension =================
      case 'task_create': {
        const task = this.engine.tasks.createTask(args.type, args.name, {
          tenant_id: tenantId,
          user_id: userId,
          project_id: projectId
        });
        return {
          content: [{ type: 'text', text: `Task '${task.name}' created with handle ${task.id} (status: ${task.status})` }],
          taskId: task.id,
          task
        };
      }

      case 'task_get': {
        const task = this.engine.tasks.getTask(args.taskId);
        if (!task) throw new Error(`Task '${args.taskId}' not found`);
        return {
          content: [{ type: 'text', text: `Task ${task.id} (${task.name}): ${task.status} (${task.progress}%)` }],
          taskId: task.id,
          status: task.status,
          progress: task.progress,
          result: task.result,
          error: task.error
        };
      }

      case 'task_cancel': {
        const cancelled = this.engine.tasks.cancelTask(args.taskId);
        return {
          content: [{ type: 'text', text: cancelled ? `Task ${args.taskId} cancelled.` : `Unable to cancel task ${args.taskId}` }],
          taskId: args.taskId,
          cancelled
        };
      }

      case 'task_list': {
        const tasks = this.engine.tasks.listTasks({ user_id: userId, status: args.status });
        return {
          content: [{ type: 'text', text: `Found ${tasks.length} task(s).` }],
          tasks
        };
      }

      // ================= Progressive Disclosure =================
      case 'memory_progressive_recall': {
        const res = await this.engine.progressiveRecall({
          tenant_id: tenantId,
          user_id: userId,
          query: args.query,
          project_id: projectId,
          maxTokens: args.maxTokens || 1000,
          targetLevel: args.targetLevel || 'canonical'
        });
        return {
          content: [{ type: 'text', text: res.context }],
          level: res.level,
          tokenCount: res.tokenCount,
          maxTokens: res.maxTokens,
          references: res.references,
          escalationRecommended: res.escalationRecommended,
          nextLevel: res.nextLevel
        };
      }

      // ================= Snapshots & Diffs =================
      case 'memory_snapshot_create': {
        if (!projectId) throw new Error('Project ID required for snapshot creation');
        const snap = this.engine.snapshots.createSnapshot(args.name, args.description || '', {
          tenant_id: tenantId,
          user_id: userId,
          project_id: projectId
        });
        return {
          content: [{ type: 'text', text: `Snapshot '${snap.name}' created with handle ${snap.id} (${snap.memory_count} memories).` }],
          snapshotId: snap.id,
          snapshot: snap
        };
      }

      case 'memory_snapshot_list': {
        if (!projectId) throw new Error('Project ID required');
        const snapshots = this.engine.snapshots.listSnapshots(projectId);
        return {
          content: [{ type: 'text', text: `Found ${snapshots.length} snapshot(s) for project ${projectId}.` }],
          snapshots
        };
      }

      case 'memory_snapshot_compare': {
        const comparison = this.engine.snapshots.compareSnapshots(args.snapshotAId, args.snapshotBId);
        return {
          content: [{ type: 'text', text: `Snapshot comparison: sameState=${comparison.sameState}, +${comparison.memoriesAdded} -${comparison.memoriesRemoved}` }],
          comparison
        };
      }

      case 'memory_diff': {
        const diff = this.engine.snapshots.computeMemoryDiff(args.memoryId, Number(args.fromVersion), Number(args.toVersion));
        return {
          content: [{ type: 'text', text: `Memory ${diff.memory_id} diff (v${diff.from_version} -> v${diff.to_version}): changed fields [${diff.changed_fields.join(', ')}]` }],
          diff
        };
      }

      // ================= Health, Review & Diagnostics =================
      case 'memory_health': {
        if (!projectId) throw new Error('Project ID required');
        const health = this.engine.getProjectHealth(projectId);
        return {
          content: [{ type: 'text', text: `Project Memory Health: ${health.overall_score}/100. Summary: ${health.diagnostic_summary.join(' ')}` }],
          health
        };
      }

      case 'memory_review_queue': {
        if (args.action === 'approve' || args.action === 'reject') {
          if (!args.itemId) throw new Error('itemId required for review action');
          this.engine.storage.updateReviewItemStatus(args.itemId, args.action, userId);
          return {
            content: [{ type: 'text', text: `Review item ${args.itemId} marked as ${args.action}d.` }],
            status: args.action
          };
        }
        const items = this.engine.storage.listReviewItems({ project_id: projectId || undefined });
        return {
          content: [{ type: 'text', text: `Found ${items.length} item(s) in review queue.` }],
          items
        };
      }

      case 'memory_explain_capture': {
        const candidate = { content: args.content };
        const shouldStore = shouldRecallMemory(args.content);
        const explanation = shouldStore
          ? 'Statement contains durable knowledge, architectural significance, or user preference.'
          : 'Statement is transient conversational context, greeting, or minor syntax adjustment.';
        return {
          content: [{ type: 'text', text: `Durability Assessment: ${shouldStore ? 'STORE' : 'IGNORE'}. Reason: ${explanation}` }],
          storeDecision: shouldStore ? 'STORE' : 'IGNORE',
          reason: explanation
        };
      }

      case 'memory_event_emit': {
        const eventRes = await this.engine.processEvent({
          type: args.type,
          content: args.content,
          tenant_id: tenantId,
          user_id: userId,
          project_id: projectId
        });
        return {
          content: [{ type: 'text', text: `Event '${eventRes.event.type}' emitted (Policy: ${eventRes.event.policy_action}, Result: ${eventRes.memory ? `Saved memory ${eventRes.memory.id}` : 'Observed/Ignored'})` }],
          event: eventRes.event,
          memoryId: eventRes.memory?.id
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  public startStdio(): void {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false
    });

    rl.on('line', async (line) => {
      if (!line.trim()) return;
      try {
        const message = JSON.parse(line);
        const response = await this.handleJsonRpc(message);
        if (response) {
          process.stdout.write(JSON.stringify(response) + '\n');
        }
      } catch (err: unknown) {
        process.stdout.write(
          JSON.stringify({
            jsonrpc: '2.0',
            id: null,
            error: { code: -32700, message: (err as Error).message }
          }) + '\n'
        );
      }
    });
  }

  private async handleJsonRpc(req: any): Promise<any> {
    const { id, method, params } = req;

    if (method === 'initialize') {
      return {
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: {}
          },
          serverInfo: {
            name: 'memoryai-mcp',
            version: '1.2.0'
          }
        }
      };
    }

    if (method === 'tools/list') {
      return {
        jsonrpc: '2.0',
        id,
        result: {
          tools: MCP_TOOLS,
          _meta: {
            cacheControl: 'max-age=300'
          }
        }
      };
    }

    if (method === 'tools/call') {
      const toolName = params?.name;
      const args = params?.arguments || {};
      try {
        const result = await this.handleToolCall(toolName, args);
        return {
          jsonrpc: '2.0',
          id,
          result
        };
      } catch (err: unknown) {
        return {
          jsonrpc: '2.0',
          id,
          error: {
            code: -32603,
            message: (err as Error).message
          }
        };
      }
    }

    if (method === 'ping') {
      return { jsonrpc: '2.0', id, result: {} };
    }

    return {
      jsonrpc: '2.0',
      id,
      error: { code: -32601, message: `Method not found: ${method}` }
    };
  }
}
