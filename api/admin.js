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

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    let body;
    try {
        body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } catch {
        return res.status(400).json({ error: 'Dados inválidos.' });
    }

    const { password } = body || {};

    if (!password || password !== process.env.ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'Senha incorreta.' });
    }

    try {
        const bookings = [];
        const keys = [];

        for await (const key of redis.scanIterator({ match: 'slot:*', count: 100 })) {
            keys.push(key);
        }

        const values = await Promise.all(keys.map(k => redis.get(k).catch(() => null)));

        for (let i = 0; i < keys.length; i++) {
            const parts = keys[i].split(':');
            if (parts.length !== 3) continue;

            const [, date, time] = parts;
            const data = values[i];

            if (data) {
                const price = SERVICES[data.service] || 0;
                bookings.push({
                    date,
                    time,
                    service: data.service,
                    name: data.name,
                    phone: data.phone,
                    price,
                    bookedAt: data.bookedAt
                });
            }
        }

        bookings.sort((a, b) => {
            if (a.date !== b.date) return b.date.localeCompare(a.date);
            return b.time.localeCompare(a.time);
        });

        const totalRevenue = bookings.reduce((sum, b) => sum + b.price, 0);
        const totalBookings = bookings.length;

        return res.status(200).json({
            success: true,
            bookings,
            totalBookings,
            totalRevenue
        });
    } catch (error) {
        console.error('Erro ao buscar dados admin:', error.message, error.stack);
        return res.status(500).json({ error: 'Erro ao carregar dados.', detail: error.message });
    }
}
