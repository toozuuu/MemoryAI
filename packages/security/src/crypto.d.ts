export declare function deriveKey(masterSecret: string, salt: Buffer): Buffer;
export declare function encryptField(plainText: string, masterSecret: string): string;
export declare function decryptField(cipherTextBase64: string, masterSecret: string): string;
export declare function hashContent(content: string): string;
export declare function generateSecureToken(byteLength?: number): string;
export declare function hashApiKey(key: string): string;
export declare function hashPassword(password: string): {
    hash: string;
    salt: string;
};
export declare function verifyPassword(password: string, hash: string, salt: string): boolean;
export declare function safeCompare(a: string, b: string): boolean;
//# sourceMappingURL=crypto.d.ts.map