const express = require('express');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const QRCode = require('qrcode');
const pino = require('pino');

const app = express();
let qrCodeData = null;
let isConnected = false;

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    const sock = makeWASocket({ auth: state, logger: pino({ level: 'silent' }) });
    sock.ev.on('creds.update', saveCreds);
    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr) qrCodeData = await QRCode.toDataURL(qr);
        if (connection === 'open') { isConnected = true; qrCodeData = null; console.log('CONNECTED'); }
        if (connection === 'close') {
            isConnected = false;
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode!== DisconnectReason.loggedOut;
            if (shouldReconnect) startBot();
        }
    });
    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;
        const from = msg.key.remoteJid;
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
        await sock.sendMessage(from, { text: `Amaglo Bot 🤖 You said: ${text}` });
    });
}
startBot();

app.get('/', async (req, res) => {
    if (isConnected) res.send('<h1>✅ Connected! Bot is LIVE</h1>');
    else if (qrCodeData) res.send(`<h1>Scan this QR</h1><img src="${qrCodeData}" width="350"/><p>WhatsApp > Linked Devices > Link Device</p><script>setTimeout(()=>location.reload(),15000)</script>`);
    else res.send('<h1>Starting bot... Wait 10 sec and refresh</h1><script>setTimeout(()=>location.reload(),5000)</script>');
});
app.listen(process.env.PORT || 10000);
