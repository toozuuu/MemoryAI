import { MemoryPackManifestSchema, MemorySchema } from '@sachin97317/types';
import { hashContent } from '@sachin97317/security';
import zlib from 'node:zlib';
import { promisify } from 'node:util';
const gzipAsync = promisify(zlib.gzip);
const gunzipAsync = promisify(zlib.gunzip);
const MAX_UNCOMPRESSED_BYTES = 50 * 1024 * 1024; // 50MB default limit
export class MemoryPackError extends Error {
    constructor(message) {
        super(message);
        this.name = 'MemoryPackError';
    }
}
export async function createMemoryPack(memories, options) {
    const memoriesJson = JSON.stringify(memories);
    const checksum = hashContent(memoriesJson);
    const manifest = {
        schema_version: '1.0.0',
        created_at: new Date().toISOString(),
        exported_by: options.exported_by || 'MemoryAI Platform',
        tenant_id: options.tenant_id,
        user_id: options.user_id,
        project_id: options.project_id || null,
        memory_count: memories.length,
        relationship_count: 0,
        checksum,
        format_version: '1.0.0'
    };
    const packData = {
        manifest,
        memories
    };
    const jsonStr = JSON.stringify(packData);
    const compressed = await gzipAsync(Buffer.from(jsonStr, 'utf8'), { level: 9 });
    return compressed;
}
export async function unpackMemoryPack(compressedBuffer, options = {}) {
    const maxBytes = options.maxSizeBytes || MAX_UNCOMPRESSED_BYTES;
    let decompressed;
    try {
        decompressed = await gunzipAsync(compressedBuffer, {
            maxOutputLength: maxBytes
        });
    }
    catch (err) {
        throw new MemoryPackError(`Failed to decompress .memorypack: ${err.message}`);
    }
    if (decompressed.length > maxBytes) {
        throw new MemoryPackError(`Decompressed data exceeds maximum allowed size (${maxBytes} bytes)`);
    }
    let parsed;
    try {
        parsed = JSON.parse(decompressed.toString('utf8'));
    }
    catch {
        throw new MemoryPackError(`Invalid JSON payload inside .memorypack archive`);
    }
    // Validate manifest
    if (!parsed.manifest) {
        throw new MemoryPackError(`Missing manifest inside .memorypack archive`);
    }
    const manifestResult = MemoryPackManifestSchema.safeParse(parsed.manifest);
    if (!manifestResult.success) {
        throw new MemoryPackError(`Manifest validation failed: ${manifestResult.error.message}`);
    }
    const manifest = manifestResult.data;
    // Validate checksum
    const memoriesJson = JSON.stringify(parsed.memories || []);
    const actualChecksum = hashContent(memoriesJson);
    if (manifest.checksum !== actualChecksum) {
        throw new MemoryPackError(`Integrity checksum mismatch: expected ${manifest.checksum}, got ${actualChecksum}`);
    }
    // Validate memories
    const validatedMemories = [];
    if (Array.isArray(parsed.memories)) {
        for (let i = 0; i < parsed.memories.length; i++) {
            const item = parsed.memories[i];
            const memRes = MemorySchema.safeParse(item);
            if (!memRes.success) {
                throw new MemoryPackError(`Memory at index ${i} failed validation: ${memRes.error.message}`);
            }
            validatedMemories.push(memRes.data);
        }
    }
    return {
        manifest,
        memories: validatedMemories,
        relationships: parsed.relationships,
        sources: parsed.sources
    };
}
//# sourceMappingURL=memorypack.js.map