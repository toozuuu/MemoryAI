import fs from 'node:fs';
import path from 'node:path';

export interface SkillMetadata {
  name: string;
  version: string;
  description: string;
  capabilities: string[];
  dependencies: string[];
  activationConditions: string[];
  toolsUsed: string[];
  securityRequirements: string[];
  path?: string;
}

export interface SkillValidationResult {
  valid: boolean;
  skillName: string;
  filePath: string;
  errors: string[];
  warnings: string[];
}

export class SkillRegistry {
  private skillsDir: string;
  private skills: Map<string, SkillMetadata> = new Map();

  constructor(skillsDir?: string) {
    this.skillsDir = skillsDir || path.join(process.cwd(), 'skills');
  }

  public loadSkills(): Map<string, SkillMetadata> {
    this.skills.clear();
    if (!fs.existsSync(this.skillsDir)) {
      return this.skills;
    }

    const entries = fs.readdirSync(this.skillsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const skillFilePath = path.join(this.skillsDir, entry.name, 'SKILL.md');
        if (fs.existsSync(skillFilePath)) {
          const meta = this.parseSkillFile(skillFilePath);
          if (meta) {
            this.skills.set(meta.name, meta);
          }
        }
      }
    }

    return this.skills;
  }

  public getSkill(name: string): SkillMetadata | undefined {
    if (this.skills.size === 0) {
      this.loadSkills();
    }
    return this.skills.get(name);
  }

  public listSkills(): SkillMetadata[] {
    if (this.skills.size === 0) {
      this.loadSkills();
    }
    return Array.from(this.skills.values());
  }

  public parseSkillFile(filePath: string): SkillMetadata | null {
    if (!fs.existsSync(filePath)) return null;
    const content = fs.readFileSync(filePath, 'utf8');
    const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);

    if (!frontmatterMatch) {
      return null;
    }

    const rawYaml = frontmatterMatch[1];
    const meta: SkillMetadata = {
      name: path.basename(path.dirname(filePath)),
      version: '1.0.0',
      description: '',
      capabilities: [],
      dependencies: [],
      activationConditions: [],
      toolsUsed: [],
      securityRequirements: [],
      path: filePath
    };

    const lines = rawYaml.split(/\r?\n/);
    let currentKey: string | null = null;

    for (const line of lines) {
      const kvMatch = line.match(/^([a-zA-Z0-9_-]+):\s*(.*)$/);
      if (kvMatch) {
        const key = kvMatch[1].trim();
        const val = kvMatch[2].trim().replace(/^["']|["']$/g, '');
        currentKey = key;

        if (key === 'name') meta.name = val;
        else if (key === 'version') meta.version = val;
        else if (key === 'description') meta.description = val;
        else if (key === 'capabilities' && val) meta.capabilities.push(val);
        else if (key === 'dependencies' && val) meta.dependencies.push(val);
        else if (key === 'activation_conditions' && val) meta.activationConditions.push(val);
        else if (key === 'tools_used' && val) meta.toolsUsed.push(val);
        else if (key === 'security_requirements' && val) meta.securityRequirements.push(val);
      } else if (line.trim().startsWith('-') && currentKey) {
        const item = line.replace(/^\s*-\s*/, '').trim().replace(/^["']|["']$/g, '');
        if (currentKey === 'capabilities') meta.capabilities.push(item);
        else if (currentKey === 'dependencies') meta.dependencies.push(item);
        else if (currentKey === 'activation_conditions') meta.activationConditions.push(item);
        else if (currentKey === 'tools_used') meta.toolsUsed.push(item);
        else if (currentKey === 'security_requirements') meta.securityRequirements.push(item);
      }
    }

    return meta;
  }

  public validateSkill(filePath: string): SkillValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const skillName = path.basename(path.dirname(filePath));

    if (!fs.existsSync(filePath)) {
      return {
        valid: false,
        skillName,
        filePath,
        errors: [`File does not exist: ${filePath}`],
        warnings: []
      };
    }

    const content = fs.readFileSync(filePath, 'utf8');

    // 1. Check YAML frontmatter presence
    const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!frontmatterMatch) {
      errors.push('Missing required YAML frontmatter delimited by ---');
    }

    const meta = this.parseSkillFile(filePath);
    if (!meta) {
      errors.push('Failed to parse YAML frontmatter');
    } else {
      if (!meta.name) errors.push('Missing required field: name');
      if (!meta.version) errors.push('Missing required field: version');
      if (!meta.description) errors.push('Missing required field: description');
      if (meta.capabilities.length === 0) warnings.push('No capabilities declared');
      if (meta.activationConditions.length === 0) warnings.push('No activation conditions declared');
    }

    // 2. Check for security vulnerabilities or secret leaks
    if (/api_key\s*:\s*["'][a-zA-Z0-9_-]{20,}["']/i.test(content) || /BEGIN\s+(RSA|OPENSSH)\s+PRIVATE/i.test(content)) {
      errors.push('CRITICAL: Possible hardcoded secret or private key found in skill definition');
    }

    // 3. Check for unsafe command executions
    if (/rm\s+-rf\s+\/|format\s+c:/i.test(content)) {
      errors.push('CRITICAL: Dangerous command pattern detected in skill instructions');
    }

    return {
      valid: errors.length === 0,
      skillName: meta?.name || skillName,
      filePath,
      errors,
      warnings
    };
  }

  public validateAllSkills(): SkillValidationResult[] {
    const results: SkillValidationResult[] = [];
    if (!fs.existsSync(this.skillsDir)) return results;

    const entries = fs.readdirSync(this.skillsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const skillPath = path.join(this.skillsDir, entry.name, 'SKILL.md');
        if (fs.existsSync(skillPath)) {
          results.push(this.validateSkill(skillPath));
        }
      }
    }

    // Check for circular dependencies
    const loaded = this.loadSkills();
    for (const [name, meta] of loaded.entries()) {
      for (const dep of meta.dependencies) {
        const depMeta = loaded.get(dep);
        if (depMeta && depMeta.dependencies.includes(name)) {
          const res = results.find((r) => r.skillName === name);
          if (res) {
            res.errors.push(`Circular dependency detected between ${name} and ${dep}`);
            res.valid = false;
          }
        }
      }
    }

    return results;
  }
}
