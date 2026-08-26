import { MemoryTask, TaskStatus } from '@sachin97317/types';
import { SqliteMemoryStorage } from '@sachin97317/storage-sqlite';
import crypto from 'node:crypto';

export class TasksManager {
  constructor(private storage: SqliteMemoryStorage) {}

  public createTask(
    type: MemoryTask['type'],
    name: string,
    context: { tenant_id?: string; user_id?: string; project_id?: string | null }
  ): MemoryTask {
    const task: MemoryTask = {
      id: `task_${crypto.randomUUID()}`,
      tenant_id: context.tenant_id || 'default',
      user_id: context.user_id || 'default-user',
      project_id: context.project_id || null,
      type,
      name,
      status: 'queued',
      progress: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    this.storage.insertTask(task);
    return task;
  }

  public getTask(id: string): MemoryTask | null {
    return this.storage.getTaskById(id);
  }

  public listTasks(filter: { user_id?: string; status?: string } = {}): MemoryTask[] {
    return this.storage.listTasks(filter);
  }

  public updateProgress(id: string, progress: number, status: TaskStatus = 'running'): void {
    this.storage.updateTask(id, { progress, status });
  }

  public completeTask(id: string, result?: Record<string, unknown>): void {
    this.storage.updateTask(id, {
      status: 'completed',
      progress: 100,
      completed_at: new Date().toISOString(),
      result: result || null
    });
  }

  public failTask(id: string, error: string): void {
    this.storage.updateTask(id, {
      status: 'failed',
      completed_at: new Date().toISOString(),
      error
    });
  }

  public cancelTask(id: string): boolean {
    const task = this.storage.getTaskById(id);
    if (!task || task.status === 'completed' || task.status === 'failed') {
      return false;
    }
    this.storage.updateTask(id, {
      status: 'cancelled',
      completed_at: new Date().toISOString()
    });
    return true;
  }
}
