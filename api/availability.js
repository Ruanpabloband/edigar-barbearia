import { redis, getCorsHeaders, handleOptions, rejectMethod, validateDate } from '../_lib/shared.js';

export default async function handler(req, res) {
    const origin = req.headers.origin || '';
    for (const [key, value] of Object.entries(getCorsHeaders(origin))) {
        res.setHeader(key, value);
    }

    if (req.method === 'OPTIONS') return handleOptions(res);
    if (req.method !== 'GET') return rejectMethod(res);

    const { date } = req.query;

    if (!date || !validateDate(date)) {
        return res.status(400).json({ error: 'Data inválida. Use formato YYYY-MM-DD.' });
    }

    try {
        const prefix = `slot:${date}:`;
        const keys = await redis.keys(`${prefix}*`);
        const bookedSlots = [];

        for (const key of keys) {
            const slot = await redis.get(key);
            if (slot && slot.status !== 'cancelled') {
                bookedSlots.push(key.replace(prefix, ''));
            }
        }

        return res.status(200).json({ booked: bookedSlots });
    } catch (error) {
        console.error('Erro ao buscar slots');
        return res.status(503).json({ error: 'Serviço temporariamente indisponível. Tente novamente.' });
    }
}
