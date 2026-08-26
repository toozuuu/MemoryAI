import { Memory, MemoryPack } from '@memoryai/types';
export declare class MemoryPackError extends Error {
    constructor(message: string);
}
export declare function createMemoryPack(memories: Memory[], options: {
    tenant_id: string;
    user_id: string;
    project_id?: string | null;
    exported_by?: string;
}): Promise<Buffer>;
export declare function unpackMemoryPack(compressedBuffer: Buffer, options?: {
    maxSizeBytes?: number;
}): Promise<MemoryPack>;
//# sourceMappingURL=memorypack.d.ts.map