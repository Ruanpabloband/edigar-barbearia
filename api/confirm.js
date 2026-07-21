import { redis, getCorsHeaders, handleOptions, rejectMethod, checkRateLimit, verifyAdminSession, validateDate, validateTime } from './_lib/shared.js';

const SERVICES = { 'Barba': 15, 'Combo Corte + Barba': 25, 'Degradê': 20, 'Corte Social': 20 };

const LUA_CONFIRM = `
local key = KEYS[1]
local data = redis.call('GET', key)
if not data then return redis.error('NOT_FOUND') end
local slot = cjson.decode(data)
if slot.status == 'confirmed' then return redis.error('ALREADY_CONFIRMED') end
if slot.status == 'cancelled' then return redis.error('CANCELLED') end
slot.status = 'confirmed'
redis.call('SET', key, cjson.encode(slot), 'EX', 2592000)
return 'OK'
`;

export default async function handler(req, res) {
    const origin = req.headers.origin || '';
    for (const [key, value] of Object.entries(getCorsHeaders(origin))) {
        res.setHeader(key, value);
    }

    if (req.method === 'OPTIONS') return handleOptions(res);
    if (req.method !== 'POST') return rejectMethod(res);

    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
    const { withinLimit } = await checkRateLimit(ip, 'confirm', 30);
    if (!withinLimit) {
        return res.status(429).json({ error: 'Muitas requisições. Aguarde 60 segundos.' });
    }

    let body;
    try {
        body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } catch {
        return res.status(400).json({ error: 'Dados inválidos.' });
    }

    const { token, date, time } = body || {};

    if (!token || !await verifyAdminSession(token)) {
        return res.status(401).json({ error: 'Sessão expirada. Faça login novamente.' });
    }

    if (!date || !time || !validateDate(date) || !validateTime(time)) {
        return res.status(400).json({ error: 'Data ou horário inválido.' });
    }

    const slotKey = `slot:${date}:${time}`;

    try {
        const result = await redis.eval(LUA_CONFIRM, [slotKey]);
        if (result === 'OK') {
            const slotData = await redis.get(slotKey);
            const slot = typeof slotData === 'string' ? JSON.parse(slotData) : slotData;

            const phone = (slot.phone || '').replace(/\D/g, '');
            if (phone) {
                const price = SERVICES[slot.service] || 0;
                const clientKey = `client:${phone}`;
                await redis.hincrby(clientKey, 'booking_count', 1).catch(() => {});
                await redis.hincrby(clientKey, 'total_spend', price).catch(() => {});
                await redis.hset(clientKey, 'name', slot.name || '', 'last_visit', date).catch(() => {});
                await redis.zadd('clients:ranking', { score: 0, member: phone }).catch(() => {});
                const totalSpend = await redis.hget(clientKey, 'total_spend').catch(() => 0);
                if (totalSpend) {
                    await redis.zadd('clients:ranking', { score: Number(totalSpend), member: phone }).catch(() => {});
                }
            }

            return res.status(200).json({
                success: true,
                message: 'Agendamento confirmado.',
                booking: { name: slot.name, phone: slot.phone, service: slot.service, date, time }
            });
        }
        return res.status(500).json({ error: 'Erro ao confirmar.' });
    } catch (error) {
        const msg = String(error.message || error);
        if (msg.includes('NOT_FOUND')) return res.status(404).json({ error: 'Agendamento não encontrado.' });
        if (msg.includes('ALREADY_CONFIRMED')) return res.status(400).json({ error: 'Agendamento já confirmado.' });
        if (msg.includes('CANCELLED')) return res.status(400).json({ error: 'Agendamento já cancelado.' });
        console.error('Erro ao confirmar');
        return res.status(500).json({ error: 'Erro ao confirmar. Tente novamente.' });
    }
}
