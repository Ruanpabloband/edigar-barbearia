import { Redis } from '@upstash/redis';

const redis = new Redis({
    url: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
    const origin = req.headers.origin || '';
    const allowed = ['https://edigar-barbearia.vercel.app', 'https://landingpage-eight-navy-89.vercel.app'];
    if (allowed.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { date } = req.query;

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ error: 'Data inválida. Use formato YYYY-MM-DD.' });
    }

    try {
        const bookedSlots = [];
        const prefix = `slot:${date}:`;

        for await (const key of redis.scanIterator({ match: `${prefix}*`, count: 100 })) {
            const time = key.replace(prefix, '');
            bookedSlots.push(time);
        }

        return res.status(200).json({ booked: bookedSlots });
    } catch (error) {
        console.error('Erro ao buscar slots:', error.message);
        return res.status(200).json({ booked: [], warning: 'Erro ao verificar disponibilidade' });
    }
}
