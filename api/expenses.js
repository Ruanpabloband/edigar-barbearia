import { redis, getCorsHeaders, handleOptions, rejectMethod, checkRateLimit, verifyAdminSession, validateDate } from './_lib/shared.js';
import crypto from 'crypto';

export default async function handler(req, res) {
    const origin = req.headers.origin || '';
    for (const [key, value] of Object.entries(getCorsHeaders(origin))) {
        res.setHeader(key, value);
    }

    if (req.method === 'OPTIONS') return handleOptions(res);

    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
    const { withinLimit } = await checkRateLimit(ip, 'expenses', 30);
    if (!withinLimit) {
        return res.status(429).json({ error: 'Muitas requisições. Aguarde 60 segundos.' });
    }

    const { token } = req.method === 'GET' ? req.query : {};

    if (!token || !await verifyAdminSession(token)) {
        return res.status(401).json({ error: 'Sessão expirada. Faça login novamente.' });
    }

    if (req.method === 'GET') {
        const { month } = req.query;
        if (!month || !/^\d{4}-\d{2}$/.test(month)) {
            return res.status(400).json({ error: 'Mês inválido. Use formato YYYY-MM.' });
        }

        try {
            const keys = await redis.keys(`expense:${month}:*`);
            const expenses = [];
            let totalExpenses = 0;

            for (const key of keys) {
                const data = await redis.get(key);
                if (data) {
                    expenses.push(data);
                    totalExpenses += data.amount || 0;
                }
            }

            expenses.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

            return res.status(200).json({ success: true, expenses, totalExpenses });
        } catch (error) {
            console.error('Erro ao buscar despesas');
            return res.status(500).json({ error: 'Erro ao carregar despesas.' });
        }
    }

    if (req.method === 'POST') {
        let body;
        try {
            body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        } catch {
            return res.status(400).json({ error: 'Dados inválidos.' });
        }

        const { description, amount, category, date } = body || {};

        if (!description || !amount || !date) {
            return res.status(400).json({ error: 'Descrição, valor e data são obrigatórios.' });
        }

        if (!validateDate(date)) {
            return res.status(400).json({ error: 'Data inválida.' });
        }

        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            return res.status(400).json({ error: 'Valor inválido.' });
        }

        const allowedCategories = ['Aluguel', 'Produtos', 'Funcionários', 'Equipamentos', 'Utilidades', 'Outros'];
        const safeCategory = allowedCategories.includes(category) ? category : 'Outros';

        const id = crypto.randomBytes(8).toString('hex');
        const month = date.substring(0, 7);
        const key = `expense:${month}:${id}`;

        const expense = {
            id,
            description: description.substring(0, 200),
            amount: numAmount,
            category: safeCategory,
            date,
            createdAt: Date.now()
        };

        try {
            await redis.set(key, expense, { ex: 7776000 });
            return res.status(200).json({ success: true, expense });
        } catch (error) {
            console.error('Erro ao criar despesa');
            return res.status(500).json({ error: 'Erro ao salvar despesa.' });
        }
    }

    if (req.method === 'DELETE') {
        let body;
        try {
            body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        } catch {
            return res.status(400).json({ error: 'Dados inválidos.' });
        }

        const { id, month } = body || {};

        if (!id || !month) {
            return res.status(400).json({ error: 'ID e mês são obrigatórios.' });
        }

        try {
            await redis.del(`expense:${month}:${id}`);
            return res.status(200).json({ success: true, message: 'Despesa removida.' });
        } catch (error) {
            console.error('Erro ao remover despesa');
            return res.status(500).json({ error: 'Erro ao remover despesa.' });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
