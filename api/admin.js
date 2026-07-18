import { Redis } from '@upstash/redis';

const redis = new Redis({
    url: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN,
});

const SERVICES = {
    'Barba': 15,
    'Combo Corte + Barba': 25,
    'Degradê': 20,
    'Corte Social': 20
};

const ALLOWED_ORIGINS = ['https://edigar-barbearia.vercel.app'];

function setCors(res, origin) {
    if (ALLOWED_ORIGINS.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
}

async function checkRateLimit(ip) {
    const key = `ratelimit:${ip}`;
    const count = await redis.incr(key).catch(() => 0);
    if (count === 1) {
        await redis.expire(key, 60).catch(() => {});
    }
    return count <= 5;
}

export default async function handler(req, res) {
    const origin = req.headers.origin || '';
    setCors(res, origin);
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
    const withinLimit = await checkRateLimit(ip);
    if (!withinLimit) {
        return res.status(429).json({ error: 'Muitas tentativas. Aguarde 60 segundos.' });
    }

    let body;
    try {
        body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } catch {
        return res.status(400).json({ error: 'Dados inválidos.' });
    }

    const { password, date: reqDate, search } = body || {};
    const targetDate = reqDate || new Date().toISOString().split('T')[0];

    if (!password || password !== process.env.ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'Senha incorreta.' });
    }

    try {
        const keys = await redis.keys(`slot:${targetDate}:*`);
        const prefix = `slot:${targetDate}:`;
        const bookings = [];
        let totalRevenue = 0;

        if (keys.length === 0) {
            await redis.srem('booked_dates', targetDate).catch(() => {});
        }

        for (const key of keys) {
            const time = key.replace(prefix, '');
            const data = await redis.get(key);

            if (data && data.status !== 'cancelled') {
                const price = SERVICES[data.service] || 0;
                const matchSearch = !search ||
                    (data.name || '').toLowerCase().includes(search.toLowerCase()) ||
                    (data.phone || '').replace(/\D/g, '').includes(search.replace(/\D/g, ''));

                if (matchSearch) {
                    bookings.push({
                        date: targetDate,
                        time,
                        service: data.service,
                        name: data.name,
                        phone: data.phone,
                        price,
                        status: data.status,
                        bookedAt: data.bookedAt
                    });
                    totalRevenue += price;
                }
            }
        }

        bookings.sort((a, b) => a.time.localeCompare(b.time));

        return res.status(200).json({
            success: true,
            today: targetDate,
            bookings,
            totalBookings: bookings.length,
            totalRevenue
        });
    } catch (error) {
        console.error('Erro ao buscar dados admin:', error.message);
        return res.status(500).json({ error: 'Erro ao carregar dados.' });
    }
}
