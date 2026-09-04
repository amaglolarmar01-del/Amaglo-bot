const express = require('express');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const QRCode = require('qrcode');
const pino = require('pino');

const app = express();
let qrCodeData = null;
let isConnected = false;

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    const sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: true
    });
    sock.ev.on('creds.update', saveCreds);
    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr) {
            qrCodeData = await QRCode.toDataURL(qr);
        }
        if (connection === 'open') {
            isConnected = true;
            qrCodeData = null;
        }
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
        await sock.sendMessage(from, { text: `Hello! Amaglo Bot here 🤖\nYou said: ${text}` });
    });
}

startBot();

app.get('/', async (req, res) => {
    if (isConnected) {
        res.send('<h1>✅ Bot Connected!</h1><p>Your bot is LIVE</p>');
    } else if (qrCodeData) {
        res.send(`<h1>Scan QR with WhatsApp</h1><p>WhatsApp > Linked Devices > Link Device</p><img src="${qrCodeData}" width="300"/><br><script>setTimeout(()=>location.reload(),10000)</script>`);
    } else {
        res.send('<h1>Starting... refresh in 5 sec</h1><script>setTimeout(()=>location.reload(),5000)</script>');
    }
});

app.get('/webhook', (req, res) => res.send('Bot running'));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log('Server running'));
