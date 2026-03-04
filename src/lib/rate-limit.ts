const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(identifier: string, limit: number, windowMs: number): boolean {
    const now = Date.now();
    let record = rateLimitMap.get(identifier);

    if (!record || record.resetAt < now) {
        record = { count: 1, resetAt: now + windowMs };
    } else {
        record.count += 1;
    }

    rateLimitMap.set(identifier, record);

    // Naive cleanup: prevent memory leaks by occasionally clearing expired records
    // In production with high traffic, use a dedicated Redis rate limiter.
    if (rateLimitMap.size > 1000) {
        const expiredKeys: string[] = [];
        rateLimitMap.forEach((val, key) => {
            if (val.resetAt < now) {
                expiredKeys.push(key);
            }
        });
        expiredKeys.forEach((key) => rateLimitMap.delete(key));
    }

    return record.count <= limit;
}
