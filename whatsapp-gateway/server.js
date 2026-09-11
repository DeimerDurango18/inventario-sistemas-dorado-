/**
 * Gateway de WhatsApp para el Inventario.
 *
 * Corre como proceso separado y expone HTTP local (por defecto :8900):
 *   GET  /health           -> { autenticado: true, numero: "57..." | null }
 *   POST /send             -> { numero, mensaje }
 *   GET  /qr               -> estado del QR (texto/imagen) si no está autenticado
 *
 * La sesión se guarda en ./session para no reescanear el QR en cada arranque.
 * Requiere escanear el QR con WhatsApp una única vez (o al cambiar de teléfono).
 */
const http = require('http');
const path = require('path');
const fs = require('fs');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const PORT = parseInt(process.env.WA_GATEWAY_PORT || '8900', 10);
const SESSION_DIR = path.join(__dirname, 'session');

fs.mkdirSync(SESSION_DIR, { recursive: true });

const CHROME_PATH = process.env.WA_CHROME_PATH || 'C:\\Users\\ddurango\\.cache\\puppeteer\\chrome-headless-shell\\win64-146.0.7680.31\\chrome-headless-shell-win64\\chrome-headless-shell.exe';

const client = new Client({
  authStrategy: new LocalAuth({ clientId: 'inventario', dataPath: SESSION_DIR }),
  puppeteer: {
    headless: true,
    executablePath: CHROME_PATH,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  },
});

let qrActual = null;     // cadena del QR (si aplica)
let ultimoError = null;
let estado = 'conectando'; // conectando | qr | autenticado | cerrado

client.on('qr', (qr) => {
  estado = 'qr';
  qrActual = qr;
  qrcode.generate(qr, { small: true });
  console.log(`[whatsapp] Escanea el QR para vincular el número (estado=qr).`);
});

client.on('ready', () => {
  estado = 'autenticado';
  qrActual = null;
  const numero = client.info && client.info.wid ? client.info.wid.user : null;
  console.log(`[whatsapp] Listo. Vinculado al número: ${numero}`);
});

client.on('authenticated', () => {
  console.log('[whatsapp] Sesión autenticada.');
});

client.on('auth_failure', (msg) => {
  estado = 'cerrado';
  ultimoError = `auth_failure: ${msg}`;
  console.error(`[whatsapp] Fallo de autenticación: ${msg}`);
});

client.on('disconnected', (reason) => {
  estado = 'cerrado';
  ultimoError = `disconnected: ${reason}`;
  console.error(`[whatsapp] Desconectado: ${reason}`);
  console.log(`[whatsapp] Reinicia el gateway para reintentar la conexión.`);
});

client.initialize().catch((err) => {
  ultimoError = String(err && err.message ? err.message : err);
  console.error(`[whatsapp] No se pudo inicializar: ${ultimoError}`);
});

function json(res, code, body) {
  const payload = JSON.stringify(body);
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(payload);
}

async function handleSend(numero, mensaje) {
  if (!numero) return { ok: false, error: 'Falta numero' };
  if (!mensaje || !mensaje.trim()) return { ok: false, error: 'Falta mensaje' };
  const normalized = String(numero).replace(/[^\d]/g, '');
  if (!normalized.startsWith('57')) normalized = '57' + normalized;
  await client.sendMessage(`${normalized}@c.us`, String(mensaje));
  return { ok: true, chat: `${normalized}@c.us` };
}

const server = http.createServer(async (req, res) => {
  const url = req.url.split('?')[0];

  if (req.method === 'GET' && url === '/health') {
    const numero = client.info && client.info.wid ? client.info.wid.user : null;
    return json(res, 200, {
      estado,
      autenticado: estado === 'autenticado',
      numero: numero ? '57' + numero : null,
      error: ultimoError,
    });
  }

  if (req.method === 'GET' && url === '/qr') {
    return json(res, 200, {
      estado,
      qr: qrActual,
      mensaje: estado === 'qr' ? 'Escanea el QR con WhatsApp > Equipos vinculados > Vincular un equipo.' : null,
    });
  }

  if (req.method === 'POST' && url === '/send') {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', async () => {
      try {
        const data = JSON.parse(body || '{}');
        if (estado !== 'autenticado') {
          return json(res, 409, { ok: false, error: `Gateway no autenticado (estado=${estado}). Escanea el QR primero.` });
        }
        const result = await handleSend(data.numero, data.mensaje);
        return result.ok ? json(res, 200, result) : json(res, 400, result);
      } catch (e) {
        return json(res, 500, { ok: false, error: String(e && e.message ? e.message : e) });
      }
    });
    return;
  }

  return json(res, 404, { ok: false, error: 'Ruta no encontrada' });
});

server.listen(PORT, () => {
  console.log(`[whatsapp] Gateway HTTP en http://127.0.0.1:${PORT}`);
});