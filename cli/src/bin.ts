#!/usr/bin/env node
import {
  cmdInit,
  cmdStatus,
  cmdRemember,
  cmdRecall,
  cmdSearch,
  cmdForget,
  cmdExport,
  cmdImport,
  cmdDoctor,
  cmdSecurityCheck,
  cmdHandoffCreate,
  cmdHandoffShow,
  cmdHandoffList,
  cmdShare,
  cmdEmbeddingsStatus,
  cmdEmbeddingsRebuild,
  cmdEmbeddingsMigrate,
  cmdSkillsList,
  cmdSkillsValidate,
  cmdSkillsTest,
  cmdMemoryCleanup,
  cmdMemoryShow,
  cmdMetrics,
  cmdStart,
  cmdStop,
  cmdSnapshot,
  cmdDiff,
  cmdHealth,
  cmdVerify,
  cmdRepair,
  cmdCost,
  cmdSimulate,
  cmdRecovery
} from './commands.js';

function parseArgs(args: string[]) {
  const flags: Record<string, any> = {};
  const positional: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      if (i + 1 < args.length && !args[i + 1].startsWith('--')) {
        flags[key] = args[i + 1];
        i++;
      } else {
        flags[key] = true;
      }
    } else if (arg.startsWith('-')) {
      const key = arg.slice(1);
      if (i + 1 < args.length && !args[i + 1].startsWith('-')) {
        flags[key] = args[i + 1];
        i++;
      } else {
        flags[key] = true;
      }
    } else {
      positional.push(arg);
    }
  }

  return { positional, flags };
}

async function main() {
  const rawArgs = process.argv.slice(2);
  if (rawArgs.length === 0) {
    printHelp();
    return;
  }

  const command = rawArgs[0];
  const { positional, flags } = parseArgs(rawArgs.slice(1));

  try {
    switch (command) {
      case 'init':
        await cmdInit({ dataDir: flags['data-dir'] });
        break;

      case 'status':
        await cmdStatus({ dataDir: flags['data-dir'] });
        break;

      case 'remember':
        if (positional.length === 0) {
          console.error('Error: Memory content is required. Usage: memoryai remember "<content>"');
          process.exit(1);
        }
        await cmdRemember(positional.join(' '), {
          type: flags['type'],
          importance: flags['importance'] ? Number(flags['importance']) : undefined,
          user: flags['user'],
          project: flags['project'],
          dataDir: flags['data-dir']
        });
        break;

      case 'recall':
        if (positional.length === 0) {
          console.error('Error: Query is required. Usage: memoryai recall "<query>"');
          process.exit(1);
        }
        await cmdRecall(positional.join(' '), {
          maxTokens: flags['max-tokens'] ? Number(flags['max-tokens']) : undefined,
          user: flags['user'],
          project: flags['project'],
          dataDir: flags['data-dir']
        });
        break;

      case 'search':
        if (positional.length === 0) {
          console.error('Error: Query is required. Usage: memoryai search "<query>"');
          process.exit(1);
        }
        await cmdSearch(positional.join(' '), {
          user: flags['user'],
          project: flags['project'],
          limit: flags['limit'] ? Number(flags['limit']) : undefined,
          dataDir: flags['data-dir']
        });
        break;

      case 'forget':
        if (positional.length === 0) {
          console.error('Error: Memory ID is required. Usage: memoryai forget <id>');
          process.exit(1);
        }
        await cmdForget(positional[0], {
          user: flags['user'],
          dataDir: flags['data-dir']
        });
        break;

      case 'memory': {
        const sub = positional[0];
        if (sub === 'show') {
          if (!positional[1]) {
            console.error('Error: Memory ID is required. Usage: memoryai memory show <id>');
            process.exit(1);
          }
          await cmdMemoryShow(positional[1], { dataDir: flags['data-dir'] });
        } else if (sub === 'search') {
          await cmdSearch(positional.slice(1).join(' '), {
            user: flags['user'],
            project: flags['project'],
            limit: flags['limit'] ? Number(flags['limit']) : undefined,
            dataDir: flags['data-dir']
          });
        } else if (sub === 'export') {
          await cmdExport(positional[1], { user: flags['user'], dataDir: flags['data-dir'] });
        } else if (sub === 'import') {
          await cmdImport(positional[1], { user: flags['user'], dataDir: flags['data-dir'] });
        } else if (sub === 'cleanup') {
          await cmdMemoryCleanup({ dataDir: flags['data-dir'] });
        } else {
          console.error('Usage: memoryai memory <show|search|export|import|cleanup>');
          process.exit(1);
        }
        break;
      }

      case 'metrics':
        await cmdMetrics({ dataDir: flags['data-dir'] });
        break;

      case 'start':
        await cmdStart();
        break;

      case 'stop':
        await cmdStop();
        break;

      case 'skills': {
        const sub = positional[0];
        if (sub === 'list') {
          await cmdSkillsList();
        } else if (sub === 'validate') {
          const ok = await cmdSkillsValidate();
          if (!ok) process.exit(1);
        } else if (sub === 'test') {
          await cmdSkillsTest();
        } else {
          console.error('Usage: memoryai skills <list|validate|test>');
          process.exit(1);
        }
        break;
      }

      case 'session': {
        const sub = positional[0];
        if (sub === 'list') {
          await cmdHandoffList({ project: flags['project'], dataDir: flags['data-dir'] });
        } else if (sub === 'handoff') {
          await cmdHandoffShow(positional[1], { project: flags['project'], dataDir: flags['data-dir'] });
        } else {
          console.error('Usage: memoryai session <list|handoff>');
          process.exit(1);
        }
        break;
      }

      case 'handoff': {
        const sub = positional[0];
        if (sub === 'create') {
          if (!flags['objective']) {
            console.error('Error: --objective is required. Usage: memoryai handoff create --objective "<text>"');
            process.exit(1);
          }
          await cmdHandoffCreate({
            objective: flags['objective'],
            completed: flags['completed'],
            unfinished: flags['unfinished'],
            decisions: flags['decisions'],
            architecture: flags['architecture'],
            files: flags['files'],
            next: flags['next'],
            project: flags['project'],
            dataDir: flags['data-dir']
          });
        } else if (sub === 'show') {
          await cmdHandoffShow(positional[1], { project: flags['project'], dataDir: flags['data-dir'] });
        } else if (sub === 'list') {
          await cmdHandoffList({ project: flags['project'], dataDir: flags['data-dir'] });
        } else {
          console.error('Usage: memoryai handoff <create|show|list>');
          process.exit(1);
        }
        break;
      }

      case 'share':
        await cmdShare({
          memory: flags['memory'],
          project: flags['project'],
          namespace: flags['namespace'],
          toUser: flags['to-user'],
          toProject: flags['to-project'],
          toNamespace: flags['to-namespace'],
          permissions: flags['permissions'],
          dataDir: flags['data-dir']
        });
        break;

      case 'embeddings': {
        const sub = positional[0];
        if (sub === 'status') {
          await cmdEmbeddingsStatus({ dataDir: flags['data-dir'] });
        } else if (sub === 'rebuild') {
          await cmdEmbeddingsRebuild({ dataDir: flags['data-dir'] });
        } else if (sub === 'migrate') {
          const modelName = flags['model'] || positional[1] || 'local';
          await cmdEmbeddingsMigrate(modelName, { dataDir: flags['data-dir'] });
        } else {
          console.error('Usage: memoryai embeddings <status|rebuild|migrate>');
          process.exit(1);
        }
        break;
      }

      case 'export':
        await cmdExport(positional[0], {
          user: flags['user'],
          dataDir: flags['data-dir']
        });
        break;

      case 'import':
        if (positional.length === 0) {
          console.error('Error: Input file is required. Usage: memoryai import <file.memorypack>');
          process.exit(1);
        }
        await cmdImport(positional[0], {
          user: flags['user'],
          dataDir: flags['data-dir']
        });
        break;

      case 'doctor':
        await cmdDoctor({ dataDir: flags['data-dir'] });
        break;

      case 'security-check':
        await cmdSecurityCheck();
        break;

      case 'snapshot':
        await cmdSnapshot(positional[0], positional.slice(1), {
          project: flags['project'],
          name: flags['name'],
          description: flags['description'],
          dataDir: flags['data-dir']
        });
        break;

      case 'diff':
        if (positional.length < 3) {
          console.error('Error: Usage: memoryai diff <memoryId> <fromVersion> <toVersion>');
          process.exit(1);
        }
        await cmdDiff(positional[0], Number(positional[1]), Number(positional[2]), {
          dataDir: flags['data-dir']
        });
        break;

      case 'health':
        await cmdHealth({
          project: flags['project'],
          dataDir: flags['data-dir']
        });
        break;

      case 'verify':
        await cmdVerify({ dataDir: flags['data-dir'] });
        break;

      case 'repair':
        await cmdRepair({ dataDir: flags['data-dir'] });
        break;

      case 'cost':
        await cmdCost({ dataDir: flags['data-dir'] });
        break;

      case 'simulate':
        await cmdSimulate(positional[0] || 'balanced', { dataDir: flags['data-dir'] });
        break;

      case 'recovery':
        await cmdRecovery({ dataDir: flags['data-dir'] });
        break;

      case 'help':
      case '--help':
      case '-h':
        printHelp();
        break;

      default:
        console.error(`Unknown command: ${command}`);
        printHelp();
        process.exit(1);
    }
  } catch (err: unknown) {
    console.error(`\x1b[31mError:\x1b[0m ${(err as Error).message}`);
    process.exit(1);
  }
}

function printHelp() {
  console.log(`
\x1b[1mMemoryAI\x1b[0m - Universal Cross-Client AI Memory Platform

\x1b[1mUsage:\x1b[0m
  memoryai <command> [arguments] [options]

\x1b[1mCore Commands:\x1b[0m
  init                                  Initialize MemoryAI local database and configuration
  status                                Show local memory count, project identity, and stats
  metrics                               Show real-time capture quality, recall rates, token savings
  remember <content>                    Store durable memory, preference, or decision
  recall <query>                        Bounded context retrieval with token budget enforcement
  search <query>                        Search memories with hybrid FTS & vector matching
  forget <id>                           Delete a memory by ID
  start / stop                          Run or stop the MemoryAI MCP daemon
  handoff <create|show|list>            Manage structured cross-session handoff records
  session <list|handoff>                Inspect multi-day session continuity records
  skills <list|validate|test>           Discover and validate modular AI skill definitions
  memory <show|search|export|import|cleanup> Manage memory records and database storage
  share [options]                       Share scoped memory, project context, or namespace
  embeddings <status|rebuild|migrate>   Manage and migrate vector embeddings
  export [file.memorypack]              Export memories to portable .memorypack format
  import <file.memorypack>              Import memories from .memorypack format
  doctor                                Run 14-point comprehensive system diagnostics
  security-check                        Verify security hardening (SSRF, prompt injection, RBAC)
  snapshot <create|list|compare>        Manage point-in-time project memory snapshots
  diff <id> <v1> <v2>                   Compare historical versions of a memory record
  health                                Project memory health diagnostic score (0-100)
  verify                                Scan database for broken provenance or orphaned vectors
  repair                                Conservative automated integrity repair
  cost                                  Calculate cloud token reduction and cost savings
  simulate [policy]                     Run sandbox memory capture/retrieval simulation
  recovery                              Disaster recovery database repair mode
  help                                  Display this help message

\x1b[1mOptions:\x1b[0m
  --max-tokens <num>        Strict token budget limit (default 1000)
  --type <type>             Memory type (preference, decision, fact, task, semantic)
  --importance <0..1>       Importance weight
  --project <projectId>     Target project ID
  --user <userId>           Target user ID (default 'default-user')
  --data-dir <path>         Custom storage directory path
`);
}

main();
