import { Redis } from '@upstash/redis';

const redis = new Redis({
    url: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN,
});

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

    const { date, time, name, phone, service } = req.body;

    if (!date || !time || !name || !phone || !service) {
        return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
        return res.status(400).json({ error: 'Formato de data ou horário inválido.' });
    }

    const slotKey = `slot:${date}:${time}`;

    try {
        const existing = await redis.get(slotKey);

        if (existing) {
            return res.status(409).json({ error: 'Horário já ocupado. Escolha outro horário.' });
        }

        await redis.set(slotKey, {
            name,
            phone,
            service,
            bookedAt: Date.now()
        }, { ex: 172800 });

        return res.status(200).json({ success: true, message: 'Horário reservado com sucesso!' });
    } catch (error) {
        console.error('Erro ao reservar slot:', error);
        return res.status(500).json({ error: 'Erro ao reservar horário. Tente novamente.' });
    }
}

export const config = {
    runtime: 'edge',
};
