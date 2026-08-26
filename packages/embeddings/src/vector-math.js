export function dotProduct(a, b) {
    const len = Math.min(a.length, b.length);
    let sum = 0;
    for (let i = 0; i < len; i++) {
        sum += a[i] * b[i];
    }
    return sum;
}
export function magnitude(v) {
    let sum = 0;
    for (let i = 0; i < v.length; i++) {
        sum += v[i] * v[i];
    }
    return Math.sqrt(sum);
}
export function normalizeVector(v) {
    const mag = magnitude(v);
    if (mag === 0)
        return new Array(v.length).fill(0);
    return v.map((x) => x / mag);
}
export function cosineSimilarity(a, b) {
    if (a.length === 0 || b.length === 0)
        return 0;
    const magA = magnitude(a);
    const magB = magnitude(b);
    if (magA === 0 || magB === 0)
        return 0;
    const dot = dotProduct(a, b);
    const sim = dot / (magA * magB);
    // Bound to [-1, 1] then normalize to [0, 1] for ranking ease
    const bounded = Math.max(-1, Math.min(1, sim));
    return (bounded + 1) / 2;
}
//# sourceMappingURL=vector-math.js.map