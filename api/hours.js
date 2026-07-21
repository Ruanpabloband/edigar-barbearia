import { redis, getCorsHeaders, handleOptions, rejectMethod, checkRateLimit, verifyAdminSession } from './_lib/shared.js';

const DEFAULT_HOURS = {
    0: null,
    1: { start: 9, end: 20 },
    2: { start: 9, end: 20 },
    3: { start: 9, end: 20 },
    4: { start: 9, end: 20 },
    5: { start: 9, end: 20 },
    6: { start: 9, end: 18 }
};

export default async function handler(req, res) {
    const origin = req.headers.origin || '';
    for (const [key, value] of Object.entries(getCorsHeaders(origin))) {
        res.setHeader(key, value);
    }

    if (req.method === 'OPTIONS') return handleOptions(res);

    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
    const { withinLimit } = await checkRateLimit(ip, 'hours', 30);
    if (!withinLimit) {
        return res.status(429).json({ error: 'Muitas requisições. Aguarde 60 segundos.' });
    }

    if (req.method === 'GET') {
        try {
            const stored = await redis.get('business_hours');
            const hours = stored || DEFAULT_HOURS;
            return res.status(200).json({ success: true, hours });
        } catch (error) {
            console.error('Erro ao buscar horários');
            return res.status(200).json({ success: true, hours: DEFAULT_HOURS });
        }
    }

    if (req.method === 'POST') {
        let body;
        try {
            body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        } catch {
            return res.status(400).json({ error: 'Dados inválidos.' });
        }

        const { token, hours } = body || {};

        if (!token || !await verifyAdminSession(token)) {
            return res.status(401).json({ error: 'Sessão expirada. Faça login novamente.' });
        }

        if (!hours || typeof hours !== 'object') {
            return res.status(400).json({ error: 'Horários inválidos.' });
        }

        const validated = {};
        for (let day = 0; day <= 6; day++) {
            const h = hours[day];
            if (h && typeof h.start === 'number' && typeof h.end === 'number' && h.start >= 0 && h.end <= 24 && h.start < h.end) {
                validated[day] = { start: h.start, end: h.end };
            } else {
                validated[day] = null;
            }
        }

        try {
            await redis.set('business_hours', validated);
            return res.status(200).json({ success: true, hours: validated });
        } catch (error) {
            console.error('Erro ao salvar horários');
            return res.status(500).json({ error: 'Erro ao salvar horários.' });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
