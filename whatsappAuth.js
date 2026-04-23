const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const pino = require('pino');

let sock;

async function initWhatsApp(phoneNumber) {
    const { state, saveCreds } = await useMultiFileAuthState('baileys_auth_info');
    const { version } = await fetchLatestBaileysVersion();

    sock = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        auth: state,
        browser: ['Ubuntu', 'Chrome', '20.0.04']
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect.error?.output?.statusCode !== 401;
            if (shouldReconnect) {
                initWhatsApp(phoneNumber);
            }
        }
    });

    if (!sock.authState.creds.registered && phoneNumber) {
        setTimeout(async () => {
            try {
                const code = await sock.requestPairingCode(phoneNumber);
                return code;
            } catch (error) {
                throw new Error('PAIRING_CODE_ERROR');
            }
        }, 3000);
    }

    return sock;
}

async function requestNewPairingCode(phoneNumber) {
    if (!sock || sock.authState.creds.registered) {
        await initWhatsApp(phoneNumber);
    }
    const code = await sock.requestPairingCode(phoneNumber);
    return code;
}

async function sendMessage(to, text) {
    if (!sock) throw new Error('WHATSAPP_NOT_INITIALIZED');
    await sock.sendMessage(`${to}@s.whatsapp.net`, { text });
}

module.exports = { initWhatsApp, requestNewPairingCode, sendMessage };