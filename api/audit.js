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

    if (fingerprint.lat && fingerprint.lon) {
        let cidadeGPS = "Cidade não identificada";
        let bairroGPS = "";

        try {
            // CORREÇÃO: Adicionado User-Agent para o satélite não bloquear a requisição
            const sateliteRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${fingerprint.lat}&lon=${fingerprint.lon}&zoom=14&accept-language=pt-br`, {
                headers: { 'User-Agent': 'InfopetoApp/1.0' }
            });
            const sateliteData = await sateliteRes.json();
            
            if (sateliteData && sateliteData.address) {
                cidadeGPS = sateliteData.address.city || sateliteData.address.town || sateliteData.address.municipality || sateliteData.address.village || cidadeGPS;
                bairroGPS = sateliteData.address.suburb || sateliteData.address.neighbourhood || "";
            }
        } catch (e) { console.error("Erro GPS", e); }

        const localNome = bairroGPS ? `${bairroGPS}, ${cidadeGPS}` : cidadeGPS;
        locText = `🎯 <b>GPS Exato:</b> ${localNome}`;
        mapsLink = `\n🗺️ <b>MAPA EXATO:</b> <a href="https://www.google.com/maps?q=${fingerprint.lat},${fingerprint.lon}">📍 Abrir no Google Maps</a>`;
        
        try {
            if (ip !== 'IP Desconhecido' && !ip.includes('127.0.0.1')) {
                const geoRes = await fetch(`http://ip-api.com/json/${ip.split(',')[0]}`);
                const geo = await geoRes.json();
                if (geo.status === 'success') locText += `\n📡 <b>Provedor (IP):</b> ${geo.isp} (Base: ${geo.city})`;
            }
        } catch(e) {}

    } else {
        try {
            if (ip !== 'IP Desconhecido' && !ip.includes('127.0.0.1')) {
                const geoRes = await fetch(`http://ip-api.com/json/${ip.split(',')[0]}`);
                const geo = await geoRes.json();
                if (geo.status === 'success') {
                    locText = `📍 <b>Cidade (Aprox. por IP):</b> ${geo.city} - ${geo.regionName}\n📡 <b>Provedor:</b> ${geo.isp}`;
                    mapsLink = `\n🗺️ <b>MAPA (Aprox.):</b> <a href="https://www.google.com/maps?q=${geo.lat},${geo.lon}">📍 Abrir no Google Maps</a>`;
                }
            }
        } catch (e) {}
    }

    const linha = "➖➖➖➖➖➖➖➖➖➖\n";
    const msgAcesso = `👀 <b>INFOPETO ACESSADO</b> 👀\n${linha}` +
        `🌐 <b>IP:</b> <code>${ip}</code>\n` +
        `${locText}\n${mapsLink}\n\n` +
        `📱 <b>DADOS DO APARELHO:</b>\n` +
        `• <b>Sistema:</b> <code>${fingerprint.userAgent}</code>\n` +
        `• <b>Ecrã:</b> ${fingerprint.tela} (Touch: ${fingerprint.touch})\n` +
        `• <b>Hardware:</b> CPU ${fingerprint.processador} | RAM ~${fingerprint.ram}GB\n` +
        `• <b>Rede:</b> Conexão ${fingerprint.conexao}\n` +
        `• <b>Bateria:</b> ${fingerprint.bateria}\n` +
        `• <b>Config:</b> ${fingerprint.idioma} | ${fingerprint.fuso}\n\n` +
        `⏰ <b>HORA ACESSO:</b> ${fingerprint.horaLocal}\n${linha}<i>Auditoria Inteligente Concluída.</i>`;
    
    let payload = { chat_id: CHAT_ID, text: msgAcesso, parse_mode: 'HTML', disable_web_page_preview: true };
    if (TOPIC_SEGURANCA) payload.message_thread_id = TOPIC_SEGURANCA;

    await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
    });

    return res.status(200).json({ success: true });
}
