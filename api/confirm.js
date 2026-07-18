import { Redis } from '@upstash/redis';

const redis = new Redis({
    url: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN,
});

const ALLOWED_ORIGINS = ['https://edigar-barbearia.vercel.app'];

export default async function handler(req, res) {
    const origin = req.headers.origin || '';
    if (ALLOWED_ORIGINS.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    let body;
    try {
        body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } catch {
        return res.status(400).json({ error: 'Dados inválidos.' });
    }

    const { password, date, time } = body || {};

    if (!password || !date || !time) {
        return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
    }

    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const rlKey = `ratelimit:${ip}`;
    const attempts = await redis.incr(rlKey);
    if (attempts === 1) await redis.expire(rlKey, 60);
    if (attempts > 30) {
        return res.status(429).json({ error: 'Muitas tentativas. Aguarde 1 minuto.' });
    }

    if (password !== process.env.ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'Senha incorreta.' });
    }

    const slotKey = `slot:${date}:${time}`;
    try {
        const slot = await redis.get(slotKey);
        if (!slot) {
            return res.status(404).json({ error: 'Agendamento não encontrado.' });
        }

        if (slot.status === 'confirmed') {
            return res.status(400).json({ error: 'Agendamento já confirmado.' });
        }

        if (slot.status === 'cancelled') {
            return res.status(400).json({ error: 'Agendamento já cancelado.' });
        }

        const ttl = await redis.ttl(slotKey);
        await redis.set(slotKey, { ...slot, status: 'confirmed' }, { ex: ttl > 0 ? ttl : 172800 });

        return res.status(200).json({ success: true, message: 'Agendamento confirmado.' });
    } catch (error) {
        console.error('Erro ao confirmar agendamento:', error.message);
        return res.status(500).json({ error: 'Erro ao confirmar. Tente novamente.' });
    }
}
