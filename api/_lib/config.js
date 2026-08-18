export const SERVICES = {
    'Barba': 15,
    'Combo Corte + Barba': 25,
    'Degradê': 20,
    'Corte Social': 20
};

export const ALLOWED_SERVICES = Object.keys(SERVICES);

// TTL para slots: 48h (pending) → 30d (confirmed/cancelled)
// Slots pendentes expiram automaticamente apos 48h sem confirmacao
export const TTL_PENDING = 172800;      // 48 horas em segundos
export const TTL_CONFIRMED = 2592000;   // 30 dias em segundos
