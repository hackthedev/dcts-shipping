export function rateLimit({ windowMs = 10_000, ipLimit = 30, sigLimit = 120, trustProxy = true } = {}) {
    const ipMap = new Map();
    const sigMap = new Map();

    const now = () => Date.now();

    const getIp = (req) => {
        if (trustProxy) {
            const xf = req.headers['x-forwarded-for'];
            if (typeof xf === 'string' && xf.length > 0) {
                const first = xf.split(',')[0].trim();
                if (first) return first;
            }
        }
        return req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress || 'unknown';
    };

    const touch = (map, key, limit) => {
        const t = now();
        let rec = map.get(key);
        if (!rec || t >= rec.resetAt) {
            rec = { count: 0, resetAt: t + windowMs };
            map.set(key, rec);
        }
        rec.count += 1;
        return {
            ok: rec.count <= limit,
            remaining: Math.max(0, limit - rec.count),
            resetAt: rec.resetAt
        };
    };

    return (req, res, next) => {
        const ip = getIp(req);
        const sig = `${req.method} ${req.path}`;

        const ipRes = touch(ipMap, ip, ipLimit);
        const sigRes = touch(sigMap, sig, sigLimit);

        res.set('X-RateLimit-IP-Limit', String(ipLimit));
        res.set('X-RateLimit-IP-Remaining', String(ipRes.remaining));
        res.set('X-RateLimit-IP-Reset', String(Math.ceil((ipRes.resetAt - now()) / 1000)));
        res.set('X-RateLimit-Signature-Limit', String(sigLimit));
        res.set('X-RateLimit-Signature-Remaining', String(sigRes.remaining));
        res.set('X-RateLimit-Signature-Reset', String(Math.ceil((sigRes.resetAt - now()) / 1000)));

        if (!ipRes.ok) {
            res.status(429).json({ type: 'error', code: 'rate_limited', blockedBy: 'ip', ip, signature: sig });
            return;
        }
        if (!sigRes.ok) {
            res.status(429).json({ type: 'error', code: 'rate_limited', blockedBy: 'signature', ip, signature: sig });
            return;
        }

        req.rateLimit = { ip, signature: sig };
        next();
    };
}
