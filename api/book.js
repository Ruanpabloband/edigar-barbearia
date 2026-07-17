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

    const { date, time, name, phone, service } = body || {};

    if (!date || !time || !name || !phone || !service) {
        return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
        return res.status(400).json({ error: 'Formato de data ou horário inválido.' });
    }

    const slotKey = `slot:${date}:${time}`;

    try {
        const result = await redis.set(slotKey, {
            name,
            phone,
            service,
            bookedAt: Date.now()
        }, { nx: true, ex: 172800 });

        if (!result) {
            return res.status(409).json({ error: 'Horário já ocupado. Escolha outro horário.' });
        }

        return res.status(200).json({ success: true, message: 'Horário reservado com sucesso!' });
    } catch (error) {
        console.error('Erro ao reservar slot:', error.message);
        return res.status(500).json({ error: 'Erro ao reservar horário. Tente novamente.' });
    }
}
