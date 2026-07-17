module.exports = async (req, res) => {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight request
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Only allow POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { name, email, phone, message } = req.body;

    // Basic validation
    if (!name || !message) {
        return res.status(400).json({ error: 'Nome e mensagem são obrigatórios.' });
    }

    const newMessage = {
        id: crypto.randomUUID(),
        name,
        email: email || '',
        phone: phone || '',
        message,
        createdAt: new Date().toISOString()
    };

    console.log('New contact message:', newMessage);

    return res.status(200).json({
        success: true,
        message: 'Mensagem enviada com sucesso!'
    });
};
