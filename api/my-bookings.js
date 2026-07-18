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
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    const { phone } = req.query;
    if (!phone) {
        return res.status(400).json({ error: 'Telefone é obrigatório.' });
    }

    const cleanPhone = phone.replace(/\D/g, '');

    try {
        const bookedDates = await redis.smembers('booked_dates');
        const today = new Date().toISOString().split('T')[0];
        const bookings = [];

        for (const date of bookedDates) {
            if (date < today) continue;
            const prefix = `slot:${date}:`;
            const keys = await redis.keys(`${prefix}*`);
            for (const key of keys) {
                const slot = await redis.get(key);
                if (slot && (slot.phone || '').replace(/\D/g, '') === cleanPhone && slot.status !== 'cancelled') {
                    const time = key.replace(prefix, '');
                    bookings.push({
                        date,
                        time,
                        service: slot.service,
                        name: slot.name,
                        status: slot.status
                    });
                }
            }
        }

        bookings.sort((a, b) => {
            if (a.date !== b.date) return a.date.localeCompare(b.date);
            return a.time.localeCompare(b.time);
        });

        return res.status(200).json({ success: true, bookings });
    } catch (error) {
        console.error('Erro ao buscar reservas:', error.message);
        return res.status(500).json({ error: 'Erro ao buscar reservas. Tente novamente.' });
    }
}
