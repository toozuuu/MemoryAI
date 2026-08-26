import { AgentIdentity, MemoryDelegation } from '@memoryai/types';

export class AgentAuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AgentAuthorizationError';
  }
}

export function assertAgentCapability(
  agent: AgentIdentity,
  requiredCapability: string
): void {
  if (!agent.capabilities || !agent.capabilities.includes(requiredCapability)) {
    throw new AgentAuthorizationError(
      `Agent '${agent.agent_id}' (${agent.agent_type}) lacks required capability: '${requiredCapability}'`
    );
  }
}

export function validateDelegation(
  delegation: MemoryDelegation,
  agentId: string,
  projectId: string,
  permission: string
): boolean {
  if (delegation.revoked) return false;
  if (delegation.target_agent_id !== agentId) return false;
  if (delegation.project_id !== projectId) return false;
  if (new Date(delegation.expires_at).getTime() < Date.now()) return false;
  return delegation.permissions.includes(permission);
}
