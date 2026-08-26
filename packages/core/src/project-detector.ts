import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export interface ProjectIdentity {
  id: string;
  name: string;
  source: 'git-remote' | 'package-manifest' | 'workspace-hash';
  rootPath: string;
}

export function normalizeGitUrl(rawUrl: string): string {
  let cleaned = rawUrl.trim();
  // Strip credentials
  cleaned = cleaned.replace(/https?:\/\/[^@]+@/, 'https://');
  // Convert git@github.com:owner/repo.git -> github.com/owner/repo
  cleaned = cleaned.replace(/^git@([^:]+):/, '$1/');
  // Strip protocol
  cleaned = cleaned.replace(/^https?:\/\//, '');
  cleaned = cleaned.replace(/^ssh:\/\//, '');
  // Strip trailing .git and slashes
  cleaned = cleaned.replace(/\.git\/?$/, '');
  cleaned = cleaned.replace(/\/+$/, '');
  return cleaned.toLowerCase();
}

export function detectProjectId(customPath?: string): ProjectIdentity {
  const startDir = path.resolve(customPath || process.cwd());
  let currentDir = startDir;

  // Traverse up to find root markers (.git, package.json, etc.)
  while (true) {
    // 1. Check .git directory
    const gitDir = path.join(currentDir, '.git');
    if (fs.existsSync(gitDir)) {
      const gitConfigPath = path.join(gitDir, 'config');
      if (fs.existsSync(gitConfigPath)) {
        try {
          const configContent = fs.readFileSync(gitConfigPath, 'utf8');
          const match = configContent.match(/url\s*=\s*(.+)/i);
          if (match && match[1]) {
            const normalized = normalizeGitUrl(match[1]);
            const projHash = crypto.createHash('sha256').update(normalized).digest('hex').substring(0, 16);
            const projName = normalized.split('/').pop() || path.basename(currentDir);
            return {
              id: `proj_${projHash}`,
              name: projName,
              source: 'git-remote',
              rootPath: currentDir
            };
          }
        } catch {
          // ignore read errors and fallback
        }
      }
    }

    // 2. Check package.json manifest
    const pkgJsonPath = path.join(currentDir, 'package.json');
    if (fs.existsSync(pkgJsonPath)) {
      try {
        const pkgData = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
        if (pkgData.name) {
          const rawName = String(pkgData.name).trim();
          const projHash = crypto.createHash('sha256').update(rawName).digest('hex').substring(0, 16);
          return {
            id: `proj_${projHash}`,
            name: rawName,
            source: 'package-manifest',
            rootPath: currentDir
          };
        }
      } catch {
        // ignore and continue
      }
    }

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      break; // Reached filesystem root
    }
    currentDir = parentDir;
  }

  // 3. Fallback: Hash normalized startDir path
  const normalizedPath = path.normalize(startDir).toLowerCase();
  const fallbackHash = crypto.createHash('sha256').update(normalizedPath).digest('hex').substring(0, 16);
  return {
    id: `proj_${fallbackHash}`,
    name: path.basename(startDir) || 'default-project',
    source: 'workspace-hash',
    rootPath: startDir
  };
}
