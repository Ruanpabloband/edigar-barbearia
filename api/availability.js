import { redis, getCorsHeaders, handleOptions, rejectMethod, checkRateLimit, validateDate, scanKeys, mget } from './_lib/shared.js';

export default async function handler(req, res) {
    const origin = req.headers.origin || '';
    for (const [key, value] of Object.entries(getCorsHeaders(origin))) {
        res.setHeader(key, value);
    }

    if (req.method === 'OPTIONS') return handleOptions(res);
    if (req.method !== 'GET') return rejectMethod(res);

    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
    const { withinLimit } = await checkRateLimit(ip, 'availability', 30);
    if (!withinLimit) {
        return res.status(429).json({ error: 'Muitas requisições. Aguarde 60 segundos.' });
    }

    const { date } = req.query;

    if (!date || !validateDate(date)) {
        return res.status(400).json({ error: 'Data inválida. Use formato YYYY-MM-DD.' });
    }

    try {
        const prefix = `slot:${date}:`;
        const keys = await scanKeys(`${prefix}*`);
        const bookedSlots = [];

        if (keys.length > 0) {
            const values = await mget(keys);
            for (let i = 0; i < keys.length; i++) {
                const raw = values[i];
                if (raw) {
                    const slot = typeof raw === 'string' ? JSON.parse(raw) : raw;
                    if (slot.status !== 'cancelled') {
                        bookedSlots.push(keys[i].replace(prefix, ''));
                    }
                }
            }
        }

        const blockedKeys = await scanKeys(`blocked:${date}:*`);
        const blockedSlots = blockedKeys.map(k => k.replace(`blocked:${date}:`, ''));

        return res.status(200).json({ booked: bookedSlots, blocked: blockedSlots });
    } catch (error) {
        console.error('Erro ao buscar slots');
        return res.status(503).json({ error: 'Serviço temporariamente indisponível. Tente novamente.' });
    }
}
