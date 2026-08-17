import { redis, getCorsHeaders, handleOptions, rejectMethod, checkRateLimit, verifyAdminSession, validateDate, validateTime } from './_lib/shared.js';

const LUA_CANCEL = `
local key = KEYS[1]
local dateKey = KEYS[2]
local date = ARGV[1]
local isAdmin = ARGV[2] == '1'
local phone = ARGV[3]
local data = redis.call('GET', key)
if not data then return redis.error('NOT_FOUND') end
local slot = cjson.decode(data)
if slot.status == 'cancelled' then return redis.error('ALREADY_CANCELLED') end
if not isAdmin then
    local cleanPhone = string.gsub(phone, '%D', '')
    local slotPhone = string.gsub(slot.phone or '', '%D', '')
    if cleanPhone ~= slotPhone then return redis.error('PHONE_MISMATCH') end
end
slot.status = 'cancelled'
redis.call('SET', key, cjson.encode(slot), 'EX', 2592000)
local remaining = tonumber(ARGV[4]) or 0
if remaining <= 1 then
    redis.call('SREM', dateKey, date)
end
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
    const { withinLimit } = await checkRateLimit(ip, 'cancel', 30);
    if (!withinLimit) {
        return res.status(429).json({ error: 'Muitas requisições. Aguarde 60 segundos.' });
    }

    let body;
    try {
        body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } catch {
        return res.status(400).json({ error: 'Dados inválidos.' });
    }

    const { token, date, time, phone } = body || {};

    if (!date || !time || !validateDate(date) || !validateTime(time)) {
        return res.status(400).json({ error: 'Data ou horário inválido.' });
    }

    let isAdmin = false;
    if (token) {
        isAdmin = await verifyAdminSession(token);
    }

    if (!isAdmin && !phone) {
        return res.status(400).json({ error: 'Telefone é obrigatório para cancelamento do cliente.' });
    }

    const slotKey = `slot:${date}:${time}`;

    try {
        const prefix = `slot:${date}:`;
        const keys = await redis.keys(`${prefix}*`);
        let activeCount = 0;
        for (const k of keys) {
            if (k === slotKey) continue;
            const raw = await redis.get(k);
            if (raw) {
                const s = typeof raw === 'string' ? JSON.parse(raw) : raw;
                if (s.status !== 'cancelled') activeCount++;
            }
        }

        const result = await redis.eval(LUA_CANCEL, [slotKey, 'booked_dates'], [date, isAdmin ? '1' : '0', phone || '', String(activeCount + 1)]);
        if (result === 'OK') {
            return res.status(200).json({ success: true, message: 'Agendamento cancelado.' });
        }
        return res.status(500).json({ error: 'Erro ao cancelar.' });
    } catch (error) {
        const msg = String(error.message || error);
        if (msg.includes('NOT_FOUND')) return res.status(404).json({ error: 'Agendamento não encontrado.' });
        if (msg.includes('ALREADY_CANCELLED')) return res.status(400).json({ error: 'Agendamento já cancelado.' });
        if (msg.includes('PHONE_MISMATCH')) return res.status(403).json({ error: 'Telefone não confere com o agendamento.' });
        console.error('Erro ao cancelar');
        return res.status(500).json({ error: 'Erro ao cancelar. Tente novamente.' });
    }
}
