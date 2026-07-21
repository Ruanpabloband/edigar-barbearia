import { redis, getCorsHeaders, handleOptions, rejectMethod, checkRateLimit, validateDate, validateTime, getClientDate } from './_lib/shared.js';

const DEFAULT_HOURS = {
    0: null,
    1: { start: 9, end: 20 },
    2: { start: 9, end: 20 },
    3: { start: 9, end: 20 },
    4: { start: 9, end: 20 },
    5: { start: 9, end: 20 },
    6: { start: 9, end: 18 }
};

async function isSlotWithinHours(dateStr, timeStr) {
    const [h] = timeStr.split(':').map(Number);
    const date = new Date(dateStr + 'T12:00:00');
    const day = date.getDay();
    let hours;
    try {
        hours = await redis.get('business_hours');
        hours = hours || DEFAULT_HOURS;
    } catch {
        hours = DEFAULT_HOURS;
    }
    const dayHours = hours[day];
    if (!dayHours) return false;
    return h >= dayHours.start && h < dayHours.end;
}

export default async function handler(req, res) {
    const origin = req.headers.origin || '';
    for (const [key, value] of Object.entries(getCorsHeaders(origin))) {
        res.setHeader(key, value);
    }

    if (req.method === 'OPTIONS') return handleOptions(res);
    if (req.method !== 'POST') return rejectMethod(res);

    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
    const { withinLimit } = await checkRateLimit(ip, 'book', 10);
    if (!withinLimit) {
        return res.status(429).json({ error: 'Muitas requisições. Aguarde 1 minuto.' });
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

    if (!validateDate(date) || !validateTime(time)) {
        return res.status(400).json({ error: 'Formato de data ou horário inválido.' });
    }

    const ALLOWED_SERVICES = ['Barba', 'Combo Corte + Barba', 'Degradê', 'Corte Social'];
    if (!ALLOWED_SERVICES.includes(service)) {
        return res.status(400).json({ error: 'Serviço inválido.' });
    }

    if (!await isSlotWithinHours(date, time)) {
        return res.status(400).json({ error: 'Horário fora do expediente.' });
    }

    const today = getClientDate(req);
    if (date < today) {
        return res.status(400).json({ error: 'Não é possível agendar em datas passadas.' });
    }

    const slotKey = `slot:${date}:${time}`;
    const blockKey = `blocked:${date}:${time}`;

    try {
        const isBlocked = await redis.get(blockKey);
        if (isBlocked) {
            return res.status(403).json({ error: 'Este horário está bloqueado.' });
        }

        const result = await redis.set(slotKey, {
            name: name.substring(0, 100),
            phone: phone.substring(0, 20),
            service,
            status: 'pending',
            bookedAt: Date.now()
        }, { nx: true, ex: 172800 });

        if (!result) {
            return res.status(409).json({ error: 'Horário já ocupado. Escolha outro horário.' });
        }

        await redis.sadd('booked_dates', date);

        return res.status(200).json({ success: true, message: 'Horário reservado com sucesso!' });
    } catch (error) {
        console.error('Erro ao reservar slot');
        return res.status(500).json({ error: 'Erro ao reservar horário. Tente novamente.' });
    }
}
