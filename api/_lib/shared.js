import { Redis } from '@upstash/redis';
import crypto from 'crypto';

const redis = new Redis({
    url: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN,
});

const ALLOWED_ORIGINS = ['https://edigar-barbearia.vercel.app'];

export function getCorsHeaders(origin) {
    if (ALLOWED_ORIGINS.includes(origin)) {
        return {
            'Access-Control-Allow-Origin': origin,
            'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        };
    }
    return {};
}

export function setCors(res, origin) {
    const headers = getCorsHeaders(origin);
    for (const [key, value] of Object.entries(headers)) {
        res.setHeader(key, value);
    }
}

export function handleOptions(res) {
    return res.status(200).end();
}

export function rejectMethod(res) {
    return res.status(405).json({ error: 'Method not allowed' });
}

export async function checkRateLimit(ip, namespace, maxRequests = 30) {
    const key = `ratelimit:${namespace}:${ip}`;
    const count = await redis.incr(key).catch(() => 0);
    if (count === 1) {
        await redis.expire(key, 60).catch(() => {});
    }
    return { withinLimit: count <= maxRequests, count };
}

export function safeCompare(a, b) {
    if (!a || !b) return false;
    try {
        const bufA = Buffer.from(a, 'utf8');
        const bufB = Buffer.from(b, 'utf8');
        if (bufA.length !== bufB.length) return false;
        return crypto.timingSafeEqual(bufA, bufB);
    } catch {
        return false;
    }
}

export async function verifyAdminSession(token) {
    if (!token) return false;
    const stored = await redis.get(`session:${token}`);
    return stored === true;
}

export async function createAdminSession() {
    const token = crypto.randomBytes(32).toString('hex');
    await redis.set(`session:${token}`, true, { ex: 3600 });
    return token;
}

export async function destroyAdminSession(token) {
    if (token) await redis.del(`session:${token}`).catch(() => {});
}

export function validateDate(date) {
    return typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date);
}

export function validateTime(time) {
    return typeof time === 'string' && /^\d{2}:\d{2}$/.test(time);
}

export function getClientDate(req) {
    const tz = req.headers['x-timezone'] || 'America/Fortaleza';
    try {
        return new Date().toLocaleDateString('sv-SE', { timeZone: tz });
    } catch {
        return new Date().toISOString().split('T')[0];
    }
}

export { redis };
