import pino from 'pino';
const REDACT_PATHS = [
    'password',
    'apiKey',
    'api_key',
    'authorization',
    'token',
    'secret',
    'encryptionKey',
    'rawMemoryContent',
    'headers.authorization',
    'headers["x-api-key"]',
    '*.password',
    '*.token',
    '*.apiKey'
];
export function createLogger(options) {
    return pino({
        name: options?.name || 'memoryai',
        level: options?.level || process.env.MEMORYAI_LOG_LEVEL || 'info',
        redact: {
            paths: REDACT_PATHS,
            censor: '[REDACTED]'
        },
        formatters: {
            level(label) {
                return { level: label };
            }
        },
        timestamp: pino.stdTimeFunctions.isoTime
    });
}
export const logger = createLogger();
//# sourceMappingURL=logger.js.map