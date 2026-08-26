export type UserRole = 'admin' | 'member' | 'viewer';

export interface AuthUser {
  id: string;
  tenant_id: string;
  email?: string;
  role: UserRole;
  project_ids?: string[];
  created_at: string;
}

export interface ApiKeyRecord {
  id: string;
  tenant_id: string;
  user_id: string;
  key_prefix: string;
  key_hash: string;
  name: string;
  role: UserRole;
  project_id?: string | null;
  created_at: string;
  expires_at: string | null;
  last_used_at: string | null;
  revoked: boolean;
}

export interface AuditLogEntry {
  id: string;
  tenant_id: string;
  user_id: string;
  action:
    | 'login'
    | 'logout'
    | 'api_key_create'
    | 'api_key_revoke'
    | 'memory_create'
    | 'memory_read'
    | 'memory_update'
    | 'memory_delete'
    | 'memory_export'
    | 'memory_import'
    | 'config_change'
    | 'admin_action'
    | 'security_event';
  resource_type: string;
  resource_id?: string | null;
  ip_address?: string;
  user_agent?: string;
  status: 'success' | 'failure' | 'blocked';
  details?: Record<string, unknown>;
  timestamp: string;
}

export interface SecurityPolicyConfig {
  ssrf_protection_enabled: boolean;
  prompt_injection_guard: boolean;
  rate_limit_enabled: boolean;
  field_encryption_enabled: boolean;
  cors_allowed_origins: string[];
}
