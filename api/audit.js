export default async function handler(req, res) {
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Acesso negado' });

    const { secret, fingerprint } = req.body;
    
    if (secret !== 'INFOPETO_AUDITORIA_ATIVA') return res.status(401).json({ error: 'Não autorizado' });

    const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
    const TOPIC_SEGURANCA = process.env.TOPIC_SEGURANCA; 

    const ip = req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'IP Desconhecido';
    let locText = 'Localização Desconhecida';
    let mapsLink = '';

    try {
        if (ip !== 'IP Desconhecido' && !ip.includes('127.0.0.1')) {
            const geoRes = await fetch(`http://ip-api.com/json/${ip.split(',')[0]}`);
            const geo = await geoRes.json();
            if (geo.status === 'success') {
                locText = `${geo.city} - ${geo.regionName} (${geo.country})\n📡 *Provedor:* ${geo.isp}`;
                mapsLink = `\n🗺️ *MAPA:* [Ver no Google Maps](http://googleusercontent.com/maps.google.com/maps?q=${geo.lat},${geo.lon})`;
            }
        }
    } catch (e) { console.error("Erro na geolocalização"); }

    const linha = "➖➖➖➖➖➖➖➖➖➖\n";
    const msgAcesso = `👀 *INFOPETO ACESSADO* 👀\n${linha}🌐 *IP:* \`${ip}\`\n📍 *LOCAL (Aprox.):* \n${locText}${mapsLink}\n\n📱 *DADOS DO APARELHO:*\n• *Bateria:* ${fingerprint.bateria}\n• *Tela:* ${fingerprint.tela}\n• *Sistema:* ${fingerprint.plataforma}\n• *Navegador:* ${fingerprint.userAgent}\n\n⏰ *HORA LOCAL:* ${fingerprint.horaLocal}\n${linha}_Auditoria Invisível Concluída._`;
    
    let payload = { chat_id: CHAT_ID, text: msgAcesso, parse_mode: 'Markdown', disable_web_page_preview: true };
    if (TOPIC_SEGURANCA) payload.message_thread_id = TOPIC_SEGURANCA;

    await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
    });

    return res.status(200).json({ success: true });
}