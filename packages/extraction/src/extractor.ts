import { ConversationEvent, MemoryCandidate, MemoryType } from '@sachin97317/types';

// High durability trigger phrases
const PREFERENCE_TRIGGERS = [
  /i(\s+always)?\s+prefer/i,
  /i(\s+always)?\s+like/i,
  /i\s+always\s+use/i,
  /my\s+favorite/i,
  /please\s+always/i,
  /do\s+not\s+use/i,
  /never\s+use/i,
  /prefer(s|red)?\s+/i
];

const DECISION_TRIGGERS = [
  /we\s+decided\s+to/i,
  /let's\s+use/i,
  /the\s+architecture\s+is/i,
  /we\s+will\s+use/i,
  /chosen\s+approach\s+is/i,
  /decision:\s*/i,
  /switched\s+(from\s+.+?\s+)?to/i
];

const FACT_TRIGGERS = [
  /our\s+stack\s+is/i,
  /database\s+is/i,
  /api\s+key\s+is/i,
  /version\s+is/i,
  /the\s+endpoint\s+is/i,
  /the\s+port\s+is/i
];

const TRANSIENT_TRIGGERS = [
  /^hello/i,
  /^hi\b/i,
  /^hey\b/i,
  /^thanks?/i,
  /^ok\b/i,
  /^sure\b/i,
  /^got it/i,
  /^bye/i,
  /^good morning/i,
  /^yeah\b/i,
  /^yep\b/i,
  /sounds good/i
];

export function extractEntitiesAndTopics(text: string): { entities: string[]; topics: string[] } {
  const entities: Set<string> = new Set();
  const topics: Set<string> = new Set();

  // Technical nouns / acronyms (e.g. SQLite, Fastify, TypeScript, Angular, Docker, REST, JWT, MCP)
  const techTerms = text.match(/\b([A-Z][a-zA-Z0-9_\-\.]{2,}|[A-Z]{2,})\b/g) || [];
  for (const term of techTerms) {
    if (!['THE', 'AND', 'FOR', 'WITH', 'THIS', 'THAT', 'FROM', 'WHAT', 'WHEN', 'WHERE'].includes(term)) {
      entities.add(term);
    }
  }

  // Quoted code symbols or project paths
  const quoted = text.match(/`([^`]+)`/g) || [];
  for (const q of quoted) {
    entities.add(q.replace(/`/g, ''));
  }

  // Topic classification
  const lower = text.toLowerCase();
  if (lower.includes('database') || lower.includes('sqlite') || lower.includes('postgres') || lower.includes('sql')) {
    topics.add('database');
  }
  if (lower.includes('security') || lower.includes('auth') || lower.includes('jwt') || lower.includes('token') || lower.includes('ssrf')) {
    topics.add('security');
  }
  if (lower.includes('frontend') || lower.includes('angular') || lower.includes('react') || lower.includes('ui')) {
    topics.add('frontend');
  }
  if (lower.includes('backend') || lower.includes('api') || lower.includes('fastify') || lower.includes('node')) {
    topics.add('backend');
  }
  if (lower.includes('deploy') || lower.includes('docker') || lower.includes('k8s') || lower.includes('nginx')) {
    topics.add('devops');
  }
  if (lower.includes('test') || lower.includes('e2e') || lower.includes('unit test')) {
    topics.add('testing');
  }

  return {
    entities: Array.from(entities),
    topics: Array.from(topics)
  };
}

export function evaluateCandidateScore(candidate: {
  content: string;
  importance?: number;
  durability?: number;
  future_usefulness?: number;
  confidence?: number;
  specificity?: number;
}): {
  score: number;
  importance: number;
  durability: number;
  future_usefulness: number;
  confidence: number;
  specificity: number;
  isTransient: boolean;
} {
  const content = candidate.content.trim();
  const lower = content.toLowerCase();

  // Check transient greetings / noise
  const isTransient = TRANSIENT_TRIGGERS.some((re) => re.test(lower)) && content.length < 40;

  let importance = candidate.importance ?? 0.5;
  let durability = candidate.durability ?? 0.5;
  let future_usefulness = candidate.future_usefulness ?? 0.5;
  let confidence = candidate.confidence ?? 0.9;
  let specificity = candidate.specificity ?? 0.5;

  if (isTransient) {
    importance = 0.05;
    durability = 0.05;
    future_usefulness = 0.05;
    specificity = 0.1;
  } else {
    // Preference check
    if (PREFERENCE_TRIGGERS.some((re) => re.test(lower))) {
      importance = Math.max(importance, 0.85);
      durability = Math.max(durability, 0.9);
      future_usefulness = Math.max(future_usefulness, 0.9);
    }
    // Decision check
    if (DECISION_TRIGGERS.some((re) => re.test(lower))) {
      importance = Math.max(importance, 0.85);
      durability = Math.max(durability, 0.85);
      future_usefulness = Math.max(future_usefulness, 0.85);
    }
    // Fact check
    if (FACT_TRIGGERS.some((re) => re.test(lower))) {
      importance = Math.max(importance, 0.75);
      durability = Math.max(durability, 0.8);
      future_usefulness = Math.max(future_usefulness, 0.75);
    }
    // Specificity based on length & entity presence
    if (content.length > 50) {
      specificity = Math.min(1.0, 0.4 + (content.length / 300) * 0.6);
    }
  }

  // Candidate memory scoring formula
  const score =
    importance * 0.25 +
    durability * 0.25 +
    future_usefulness * 0.20 +
    confidence * 0.15 +
    specificity * 0.15;

  return {
    score: Number(score.toFixed(4)),
    importance,
    durability,
    future_usefulness,
    confidence,
    specificity,
    isTransient
  };
}

export function classifyMemoryType(text: string): MemoryType {
  const lower = text.toLowerCase();
  if (PREFERENCE_TRIGGERS.some((re) => re.test(lower))) return 'preference';
  if (DECISION_TRIGGERS.some((re) => re.test(lower))) return 'decision';
  if (lower.includes('todo') || lower.includes('task:') || lower.includes('will do')) return 'task';
  if (FACT_TRIGGERS.some((re) => re.test(lower))) return 'fact';
  if (TRANSIENT_TRIGGERS.some((re) => re.test(lower))) return 'temporary';
  return 'semantic';
}

export function extractMemoriesFromConversation(
  events: ConversationEvent[],
  options?: { minScore?: number; tenant_id?: string; user_id?: string; project_id?: string }
): MemoryCandidate[] {
  const candidates: MemoryCandidate[] = [];
  const minScore = options?.minScore ?? 0.45;

  for (const event of events) {
    if (event.role === 'tool') continue;

    const text = event.content.trim();
    if (text.length < 10) continue;

    const evaluation = evaluateCandidateScore({ content: text });
    if (evaluation.isTransient || evaluation.score < minScore) {
      continue;
    }

    const { entities, topics } = extractEntitiesAndTopics(text);
    const memType = classifyMemoryType(text);

    candidates.push({
      content: text,
      type: memType,
      entities,
      topics,
      importance: evaluation.importance,
      durability: evaluation.durability,
      future_usefulness: evaluation.future_usefulness,
      confidence: evaluation.confidence,
      specificity: evaluation.specificity,
      source_provider: event.provider,
      source_session_id: event.sessionId,
      source_message_id: event.messageId,
      project_id: options?.project_id,
      privacy_level: 'internal'
    });
  }

  return candidates;
}
