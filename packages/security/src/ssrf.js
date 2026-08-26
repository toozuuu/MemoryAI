import dns from 'node:dns/promises';
import net from 'node:net';
export class SSRFError extends Error {
    constructor(message) {
        super(message);
        this.name = 'SSRFError';
    }
}
// IP range blocks
function isPrivateIp(ip) {
    if (net.isIPv4(ip)) {
        const parts = ip.split('.').map(Number);
        // 0.0.0.0/8
        if (parts[0] === 0)
            return true;
        // 10.0.0.0/8
        if (parts[0] === 10)
            return true;
        // 127.0.0.0/8
        if (parts[0] === 127)
            return true;
        // 169.254.0.0/16 (Link local / Cloud metadata 169.254.169.254)
        if (parts[0] === 169 && parts[1] === 254)
            return true;
        // 172.16.0.0/12
        if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31)
            return true;
        // 192.168.0.0/16
        if (parts[0] === 192 && parts[1] === 168)
            return true;
        // Broadcast
        if (ip === '255.255.255.255')
            return true;
        return false;
    }
    if (net.isIPv6(ip)) {
        const normalized = ip.toLowerCase();
        // Loopback
        if (normalized === '::1' || normalized === '0:0:0:0:0:0:0:1')
            return true;
        // Unspecified
        if (normalized === '::' || normalized === '0:0:0:0:0:0:0:0')
            return true;
        // Unique local address (fc00::/7)
        if (normalized.startsWith('fc') || normalized.startsWith('fd'))
            return true;
        // Link local (fe80::/10)
        if (normalized.startsWith('fe80:'))
            return true;
        // IPv4 mapped
        if (normalized.startsWith('::ffff:')) {
            const ipv4Part = normalized.substring(7);
            return isPrivateIp(ipv4Part);
        }
        return false;
    }
    return true;
}
export async function validateUrlForSSRF(rawUrl, allowedHostnames) {
    let parsed;
    try {
        parsed = new URL(rawUrl);
    }
    catch {
        throw new SSRFError(`Invalid URL format: ${rawUrl}`);
    }
    // Only allow http and https
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        throw new SSRFError(`Forbidden URL protocol '${parsed.protocol}'. Only http and https allowed.`);
    }
    const hostname = parsed.hostname;
    // Block localhost and metadata keywords directly
    if (hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname === '0.0.0.0' ||
        hostname === 'metadata.google.internal' ||
        hostname.endsWith('.internal') ||
        hostname.endsWith('.local')) {
        throw new SSRFError(`Target hostname '${hostname}' is restricted.`);
    }
    if (allowedHostnames && allowedHostnames.length > 0) {
        const isAllowed = allowedHostnames.some((allowed) => allowed.startsWith('*') ? hostname.endsWith(allowed.slice(1)) : hostname === allowed);
        if (!isAllowed) {
            throw new SSRFError(`Hostname '${hostname}' is not in the allowlist.`);
        }
    }
    // Resolve DNS to check resulting IP addresses against private ranges
    try {
        const addresses = await dns.lookup(hostname, { all: true });
        for (const record of addresses) {
            if (isPrivateIp(record.address)) {
                throw new SSRFError(`Destination hostname '${hostname}' resolved to prohibited IP '${record.address}'`);
            }
        }
    }
    catch (err) {
        if (err instanceof SSRFError)
            throw err;
        throw new SSRFError(`DNS resolution failed for hostname '${hostname}': ${err.message}`);
    }
    return parsed.toString();
}
//# sourceMappingURL=ssrf.js.map