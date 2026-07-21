import { redis, getCorsHeaders, handleOptions, rejectMethod, checkRateLimit, verifyAdminSession, validateDate, validateTime } from './_lib/shared.js';

export default async function handler(req, res) {
    const origin = req.headers.origin || '';
    for (const [key, value] of Object.entries(getCorsHeaders(origin))) {
        res.setHeader(key, value);
    }

    if (req.method === 'OPTIONS') return handleOptions(res);
    if (req.method !== 'POST') return rejectMethod(res);

    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
    const { withinLimit } = await checkRateLimit(ip, 'block', 30);
    if (!withinLimit) {
        return res.status(429).json({ error: 'Muitas requisições. Aguarde 60 segundos.' });
    }

    let body;
    try {
        body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } catch {
        return res.status(400).json({ error: 'Dados inválidos.' });
    }

    const { token, date, time, action } = body || {};

    if (!token || !await verifyAdminSession(token)) {
        return res.status(401).json({ error: 'Sessão expirada. Faça login novamente.' });
    }

    if (!date || !time || !validateDate(date) || !validateTime(time)) {
        return res.status(400).json({ error: 'Data ou horário inválido.' });
    }

    if (!['block', 'unblock'].includes(action)) {
        return res.status(400).json({ error: 'Ação inválida. Use "block" ou "unblock".' });
    }

    const blockKey = `blocked:${date}:${time}`;

    try {
        if (action === 'block') {
            const existing = await redis.get(`slot:${date}:${time}`);
            if (existing && existing.status !== 'cancelled') {
                return res.status(409).json({ error: 'Horário já possui agendamento ativo.' });
            }
            await redis.set(blockKey, { blocked: true, blockedAt: Date.now() }, { ex: 2592000 });
            await redis.sadd('blocked_dates', date).catch(() => {});
            return res.status(200).json({ success: true, message: 'Horário bloqueado.' });
        } else {
            await redis.del(blockKey);
            const remaining = await redis.keys(`blocked:${date}:*`);
            if (remaining.length === 0) {
                await redis.srem('blocked_dates', date).catch(() => {});
            }
            return res.status(200).json({ success: true, message: 'Horário desbloqueado.' });
        }
    } catch (error) {
        console.error('Erro ao bloquear/desbloquear horário');
        return res.status(500).json({ error: 'Erro ao processar. Tente novamente.' });
    }
}
