import { redis, getCorsHeaders, handleOptions, rejectMethod, checkRateLimit, verifyAdminSession, destroyAdminSession, validateDate } from '../_lib/shared.js';

const SERVICES = {
    'Barba': 15,
    'Combo Corte + Barba': 25,
    'Degradê': 20,
    'Corte Social': 20
};

export default async function handler(req, res) {
    const origin = req.headers.origin || '';
    for (const [key, value] of Object.entries(getCorsHeaders(origin))) {
        res.setHeader(key, value);
    }

    if (req.method === 'OPTIONS') return handleOptions(res);
    if (req.method !== 'POST') return rejectMethod(res);

    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
    const { withinLimit } = await checkRateLimit(ip, 'admin', 30);
    if (!withinLimit) {
        return res.status(429).json({ error: 'Muitas requisições. Aguarde 60 segundos.' });
    }

    let body;
    try {
        body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } catch {
        return res.status(400).json({ error: 'Dados inválidos.' });
    }

    const { token, date: reqDate, search, logout } = body || {};

    if (logout) {
        await destroyAdminSession(token);
        return res.status(200).json({ success: true });
    }

    if (!await verifyAdminSession(token)) {
        return res.status(401).json({ error: 'Sessão expirada. Faça login novamente.' });
    }

    const targetDate = reqDate || new Date().toISOString().split('T')[0];
    if (!validateDate(targetDate)) {
        return res.status(400).json({ error: 'Data inválida.' });
    }

    try {
        const keys = await redis.keys(`slot:${targetDate}:*`);
        const bookings = [];
        let totalRevenue = 0;

        if (keys.length === 0) {
            await redis.srem('booked_dates', targetDate).catch(() => {});
        }

        for (const key of keys) {
            const time = key.replace(`slot:${targetDate}:`, '');
            const data = await redis.get(key);

            if (data && data.status !== 'cancelled') {
                const price = SERVICES[data.service] || 0;
                const matchSearch = !search ||
                    (data.name || '').toLowerCase().includes(search.toLowerCase()) ||
                    (data.phone || '').replace(/\D/g, '').includes(search.replace(/\D/g, ''));

                if (matchSearch) {
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

        bookings.sort((a, b) => a.time.localeCompare(b.time));

        return res.status(200).json({
            success: true,
            today: targetDate,
            bookings,
            totalBookings: bookings.length,
            totalRevenue
        });
    } catch (error) {
        console.error('Erro ao buscar dados admin');
        return res.status(500).json({ error: 'Erro ao carregar dados.' });
    }
}
