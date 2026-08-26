export declare class SSRFError extends Error {
    constructor(message: string);
}
export declare function validateUrlForSSRF(rawUrl: string, allowedHostnames?: string[]): Promise<string>;
//# sourceMappingURL=ssrf.d.ts.map