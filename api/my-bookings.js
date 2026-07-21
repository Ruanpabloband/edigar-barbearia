import { redis, getCorsHeaders, handleOptions, rejectMethod, checkRateLimit, getClientDate } from '../_lib/shared.js';

export default async function handler(req, res) {
    const origin = req.headers.origin || '';
    for (const [key, value] of Object.entries(getCorsHeaders(origin))) {
        res.setHeader(key, value);
    }

    if (req.method === 'OPTIONS') return handleOptions(res);
    if (req.method !== 'GET') return rejectMethod(res);

    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
    const { withinLimit } = await checkRateLimit(ip, 'mybookings', 15);
    if (!withinLimit) {
        return res.status(429).json({ error: 'Muitas requisições. Aguarde 1 minuto.' });
    }

    const { phone } = req.query;
    if (!phone) {
        return res.status(400).json({ error: 'Telefone é obrigatório.' });
    }

    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 10 || cleanPhone.length > 15) {
        return res.status(400).json({ error: 'Telefone inválido.' });
    }

    try {
        const bookedDates = await redis.smembers('booked_dates');
        const today = getClientDate(req);
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
        console.error('Erro ao buscar reservas');
        return res.status(500).json({ error: 'Erro ao buscar reservas. Tente novamente.' });
    }
}
