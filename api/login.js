import { redis, getCorsHeaders, handleOptions, rejectMethod, checkRateLimit, safeCompare, createAdminSession, getClientDate, scanKeys, mget } from './_lib/shared.js';
import { SERVICES } from './_lib/config.js';

export default async function handler(req, res) {
    try {
        const origin = req.headers.origin || '';
        for (const [key, value] of Object.entries(getCorsHeaders(origin))) {
            res.setHeader(key, value);
        }

        if (req.method === 'OPTIONS') return handleOptions(res);
        if (req.method !== 'POST') return rejectMethod(res);

        const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
        const { withinLimit } = await checkRateLimit(ip, 'login', 10);
        if (!withinLimit) {
            return res.status(429).json({ error: 'Muitas tentativas. Aguarde 1 minuto.' });
        }

        let body;
        try {
            body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        } catch {
            return res.status(400).json({ error: 'Dados inválidos.' });
        }

        const { password, date: reqDate } = body || {};
        const targetDate = reqDate || getClientDate(req);

        if (!password || !safeCompare(password, process.env.ADMIN_PASSWORD)) {
            return res.status(401).json({ error: 'Senha incorreta.' });
        }

        const token = await createAdminSession();
        const keys = await scanKeys(`slot:${targetDate}:*`);
        const bookings = [];
        let totalRevenue = 0;

        if (keys.length === 0) {
            await redis.srem('booked_dates', targetDate).catch(() => {});
        }

        if (keys.length > 0) {
            const values = await mget(keys);
            for (let i = 0; i < keys.length; i++) {
                const time = keys[i].replace(`slot:${targetDate}:`, '');
                const raw = values[i];
                if (raw) {
                    const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
                    if (data.status !== 'cancelled') {
                        const price = SERVICES[data.service] || 0;
                        bookings.push({
                            date: targetDate,
                            time,
                            service: data.service,
                            name: data.name,
                            phone: data.phone,
                            price,
                            status: data.status,
                            bookedAt: data.bookedAt
                        });
                        totalRevenue += price;
                    }
                }
            }
        }

        bookings.sort((a, b) => a.time.localeCompare(b.time));

        return res.status(200).json({
            success: true,
            token,
            today: targetDate,
            bookings,
            totalBookings: bookings.length,
            totalRevenue
        });
    } catch (error) {
        console.error('Erro login:', error.message || error);
        if (!res.headersSent) {
            return res.status(500).json({ error: 'Erro ao fazer login. Tente novamente.' });
        }
    }
}
