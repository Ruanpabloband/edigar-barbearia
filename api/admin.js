import { redis, getCorsHeaders, handleOptions, rejectMethod, checkRateLimit, verifyAdminSession, destroyAdminSession, validateDate, getClientDate, scanKeys, mget } from './_lib/shared.js';
import { SERVICES } from './_lib/config.js';

export default async function handler(req, res) {
    const origin = req.headers.origin || '';
    for (const [key, value] of Object.entries(getCorsHeaders(origin))) {
        res.setHeader(key, value);
    }

    if (req.method === 'OPTIONS') return handleOptions(res);
    try {
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

    const { token, date: reqDate, month: reqMonth, mode, search, logout } = body || {};

    if (!await verifyAdminSession(token)) {
        return res.status(401).json({ error: 'Sessão expirada. Faça login novamente.' });
    }

    if (logout) {
        await destroyAdminSession(token).catch(() => {});
        return res.status(200).json({ success: true });
    }

    try {
        if (mode === 'monthly' && reqMonth && /^\d{4}-\d{2}$/.test(reqMonth)) {
            const allDates = await redis.smembers('booked_dates').catch(() => []);
            const monthDates = allDates.filter(d => d.startsWith(reqMonth));

            const bookings = [];
            let totalRevenue = 0;

            for (const dateStr of monthDates) {
                const keys = await scanKeys(`slot:${dateStr}:*`);
                if (keys.length > 0) {
                    const values = await mget(keys);
                    for (let i = 0; i < keys.length; i++) {
                        const time = keys[i].replace(`slot:${dateStr}:`, '');
                        const raw = values[i];
                        if (raw) {
                            const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
                            if (data.status !== 'cancelled') {
                                const price = SERVICES[data.service] || 0;
                                const matchSearch = !search ||
                                    (data.name || '').toLowerCase().includes(search.toLowerCase()) ||
                                    (data.phone || '').replace(/\D/g, '').includes(search.replace(/\D/g, ''));
                                if (matchSearch) {
                                    bookings.push({ date: dateStr, time, service: data.service, name: data.name, phone: data.phone, price, status: data.status, bookedAt: data.bookedAt });
                                    totalRevenue += price;
                                }
                            }
                        }
                    }
                }
            }

            bookings.sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));

            const blocked = [];
            for (const dateStr of monthDates) {
                const bkKeys = await scanKeys(`blocked:${dateStr}:*`);
                for (const k of bkKeys) {
                    blocked.push({ date: dateStr, time: k.replace(`blocked:${dateStr}:`, ''), status: 'blocked' });
                }
            }

            return res.status(200).json({
                success: true,
                mode: 'monthly',
                month: reqMonth,
                bookings,
                blocked,
                totalBookings: bookings.length,
                totalRevenue
            });
        }

        const targetDate = reqDate || getClientDate(req);
        if (!validateDate(targetDate)) {
            return res.status(400).json({ error: 'Data inválida.' });
        }

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
            }
        }

        bookings.sort((a, b) => a.time.localeCompare(b.time));

        const blockedKeys = await scanKeys(`blocked:${targetDate}:*`);
        const blocked = blockedKeys.map(k => ({
            date: targetDate,
            time: k.replace(`blocked:${targetDate}:`, ''),
            status: 'blocked'
        }));

        let bestClient = null;
        try {
            const topClients = await redis.zrevrange('clients:ranking', 0, 4, { withScores: true });
            if (topClients && topClients.length > 0) {
                const topPhone = topClients[0].member;
                const clientData = await redis.hgetall(`client:${topPhone}`);
                if (clientData && clientData.name) {
                    bestClient = { phone: topPhone, name: clientData.name, bookingCount: Number(clientData.booking_count) || 0, totalSpend: Number(clientData.total_spend) || 0 };
                }
            }
        } catch {}

        return res.status(200).json({
            success: true,
            today: targetDate,
            bookings,
            blocked,
            totalBookings: bookings.length,
            totalRevenue,
            bestClient
        });
    } catch (error) {
        console.error('Erro ao buscar dados admin');
        return res.status(500).json({ error: 'Erro ao carregar dados.' });
    }
    } catch (error) {
        console.error('Erro interno no handler admin:', error);
        if (!res.headersSent) return res.status(500).json({ error: 'Erro interno do servidor.' });
    }
}
