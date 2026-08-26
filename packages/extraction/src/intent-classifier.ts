import { MemoryScope } from '@memoryai/types';

// Patterns indicating self-contained questions that do NOT require historical project retrieval
const TRIVIAL_OR_GENERIC_PATTERNS = [
  /^(what is|how do i|how to)\s+(calculate|convert|format|parse|sort|reverse)\b/i,
  /^\d+\s*[\+\-\*\/]\s*\d+/,
  /^write\s+(a\s+)?(simple\s+)?(regex|function|hello\s+world|script\s+to\s+print)\b/i,
  /^explain\s+(how\s+)?(async\/await|closures|binary\s+search|quicksort|b-tree|tcp|http)\b/i,
  /^(who is|what is the capital of|how many days in)\b/i,
  /^(hi|hello|hey|good morning|thanks|thank you)\b/i
];

// Patterns strongly indicating need for memory recall
const HISTORICAL_OR_PROJECT_PATTERNS = [
  /continue\s+(the\s+|our\s+)?(work|task|feature|bug|refactor|migration)/i,
  /yesterday|previous(ly)?|last\s+time|earlier|where\s+we\s+left\s+off/i,
  /our\s+(stack|architecture|decision|convention|database|auth|config|api)/i,
  /what\s+did\s+we\s+(decide|choose|use|implement|change)/i,
  /why\s+did\s+we\s+(use|switch|choose|pick)/i,
  /how\s+do\s+we\s+(handle|structure|deploy|test|run)\s+(in\s+this\s+project|our)/i,
  /my\s+preference|user\s+preference|preferred\s+tool/i,
  /fix\s+(the\s+)?(issue|bug|problem)\s+with/i,
  /implement\s+|refactor\s+|build\s+|add\s+support\s+for/i
];

const USER_SCOPE_TRIGGERS = [
  /^(i\s+prefer|i\s+always|i\s+like|my\s+preference|my\s+style|my\s+favorite|never\s+use\s+for\s+me)\b/i,
  /\b(user\s+prefers?|developer\s+prefers?)\b/i
];

const TASK_SCOPE_TRIGGERS = [
  /^(currently\s+fixing|working\s+on|in\s+progress|todo:|current\s+task|bug\s+fix\s+for|investigating)\b/i,
  /\b(step\s+\d+|next\s+step|unresolved\s+issue)\b/i
];

const PROJECT_SCOPE_TRIGGERS = [
  /^(this\s+project|the\s+project|our\s+stack|we\s+decided|architectural\s+decision|database\s+is|api\s+is|framework\s+is)\b/i,
  /\b(migrated\s+to|standardized\s+on|repository\s+structure|port\s+is)\b/i
];

export function shouldRecallMemory(
  query: string,
  options: { hasActiveProject?: boolean } = {}
): { shouldRecall: boolean; reason: string } {
  const cleaned = query.trim();
  if (cleaned.length < 4) {
    return { shouldRecall: false, reason: 'Query too short to warrant memory retrieval' };
  }

  // 1. Check strong project/historical indicators
  for (const pattern of HISTORICAL_OR_PROJECT_PATTERNS) {
    if (pattern.test(cleaned)) {
      return {
        shouldRecall: true,
        reason: 'Detected historical, architectural, or task continuation intent'
      };
    }
  }

  // 2. Check trivial / generic queries
  for (const pattern of TRIVIAL_OR_GENERIC_PATTERNS) {
    if (pattern.test(cleaned)) {
      return {
        shouldRecall: false,
        reason: 'Generic or standalone query that does not require project history'
      };
    }
  }

  // 3. If in active project workspace and query is substantive (>25 chars), default to helpful recall
  if (options.hasActiveProject && cleaned.length > 20) {
    return {
      shouldRecall: true,
      reason: 'Active project workspace contextual query'
    };
  }

  return {
    shouldRecall: false,
    reason: 'Standard query with no project history markers'
  };
}

export function classifyMemoryScope(content: string): MemoryScope {
  const cleaned = content.trim();

  for (const re of USER_SCOPE_TRIGGERS) {
    if (re.test(cleaned)) return 'user';
  }

  for (const re of TASK_SCOPE_TRIGGERS) {
    if (re.test(cleaned)) return 'session'; // or 'user'/'project' mapped to task/session
  }

  for (const re of PROJECT_SCOPE_TRIGGERS) {
    if (re.test(cleaned)) return 'project';
  }

  return 'project';
}
