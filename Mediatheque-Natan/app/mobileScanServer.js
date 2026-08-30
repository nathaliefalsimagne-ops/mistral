// Pont de scan mobile : sert une page web (accessible depuis le téléphone,
// sur le même réseau Wi-Fi que l'ordinateur) qui utilise la caméra du
// téléphone pour scanner un code-barres et le renvoie à l'application.
//
// Nécessite HTTPS : les navigateurs mobiles n'autorisent l'accès à la
// caméra (getUserMedia) que dans un contexte sécurisé, ce qui exclut un
// simple http://<ip locale>. Le certificat est auto-signé et généré à la
// volée : le téléphone affichera un avertissement "connexion non
// sécurisée" à accepter une fois — normal pour un service qui ne quitte
// jamais le réseau local de la maison.

const https = require('https');
const crypto = require('crypto');
const os = require('os');
const path = require('path');
const { EventEmitter } = require('events');
const express = require('express');
const QRCode = require('qrcode');
const selfsigned = require('selfsigned');

const SESSION_TTL_MS = 5 * 60 * 1000;

function getLanAddress() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return null;
}

function renderMobilePage(token) {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Scanner - Médiathèque NATAN</title>
  <style>
    :root { --accent: #D90429; --bg: #1A1B2E; }
    * { box-sizing: border-box; }
    body {
      margin: 0; min-height: 100vh; display: flex; flex-direction: column;
      align-items: center; justify-content: center; gap: 16px; padding: 16px;
      background: var(--bg); color: #E9ECEF;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      text-align: center;
    }
    h1 { font-size: 18px; margin: 0; }
    video { width: 100%; max-width: 480px; border-radius: 12px; background: #000; }
    #status { font-size: 15px; color: #8D99AE; min-height: 20px; }
    #manual { display: flex; gap: 8px; width: 100%; max-width: 480px; }
    #manual input {
      flex: 1; padding: 10px; border-radius: 8px; border: 1px solid #4A4D6A;
      background: #2B2D42; color: #fff; font-size: 16px;
    }
    #manual button, #retry {
      padding: 10px 16px; border-radius: 8px; border: none;
      background: var(--accent); color: #fff; font-size: 15px;
    }
    #success { display: none; font-size: 20px; }
  </style>
</head>
<body>
  <h1>📷 Scanner un code-barres</h1>
  <div id="scan-ui">
    <video id="video" muted playsinline></video>
    <p id="status">Autorisez l'accès à la caméra...</p>
    <form id="manual">
      <input id="manual-input" inputmode="numeric" placeholder="Ou saisissez le code manuellement">
      <button type="submit">OK</button>
    </form>
  </div>
  <div id="success">
    ✅ Code envoyé à Médiathèque NATAN.<br>Vous pouvez fermer cette page.
  </div>

  <script src="/zxing-browser.min.js"></script>
  <script>
    const token = ${JSON.stringify(token)};
    const statusEl = document.getElementById('status');

    async function sendResult(barcode) {
      try {
        const res = await fetch('/scan/' + token + '/result', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ barcode })
        });
        if (!res.ok) throw new Error('Échec de l\\'envoi');
        document.getElementById('scan-ui').style.display = 'none';
        document.getElementById('success').style.display = 'block';
        if (window.__reader) window.__reader.reset();
      } catch (err) {
        statusEl.textContent = 'Erreur : ' + err.message + ' (le lien a peut-être expiré, régénérez un QR code)';
      }
    }

    document.getElementById('manual').addEventListener('submit', (e) => {
      e.preventDefault();
      const value = document.getElementById('manual-input').value.trim();
      if (value) sendResult(value);
    });

    (async () => {
      try {
        const reader = new ZXingBrowser.BrowserMultiFormatReader();
        window.__reader = reader;
        await reader.decodeFromConstraints(
          { video: { facingMode: 'environment' } },
          'video',
          (result, err) => {
            if (result) sendResult(result.getText());
          }
        );
        statusEl.textContent = 'Visez le code-barres avec la caméra.';
      } catch (err) {
        statusEl.textContent = 'Caméra indisponible (' + err.message + '). Utilisez la saisie manuelle ci-dessous.';
      }
    })();
  </script>
</body>
</html>`;
}

class MobileScanServer extends EventEmitter {
  constructor() {
    super();
    this.server = null;
    this.port = null;
    this.sessions = new Map();
  }

  ensureStarted() {
    if (this.server) return Promise.resolve();

    const app = express();
    app.use(express.json());

    app.get('/zxing-browser.min.js', (req, res) => {
      // Copié à côté de main.js par CopyWebpackPlugin (voir webpack.main.config.js) :
      // plus robuste qu'un require.resolve() vers node_modules une fois bundlé/packagé.
      res.sendFile(path.join(__dirname, 'zxing-browser.min.js'));
    });

    app.get('/scan/:token', (req, res) => {
      const session = this.sessions.get(req.params.token);
      if (!session || session.expiresAt < Date.now()) {
        res.status(410).send('<h1>Lien expiré</h1><p>Générez un nouveau QR code depuis Médiathèque NATAN.</p>');
        return;
      }
      res.send(renderMobilePage(req.params.token));
    });

    app.post('/scan/:token/result', (req, res) => {
      const session = this.sessions.get(req.params.token);
      if (!session || session.expiresAt < Date.now()) {
        res.status(410).json({ success: false, error: 'expired' });
        return;
      }
      const barcode = (req.body && req.body.barcode || '').toString().trim();
      if (!barcode) {
        res.status(400).json({ success: false, error: 'missing barcode' });
        return;
      }
      this.sessions.delete(req.params.token);
      this.emit('result', { token: req.params.token, barcode });
      res.json({ success: true });
    });

    const pems = selfsigned.generate([{ name: 'commonName', value: 'mediatheque-natan.local' }], { days: 3650 });

    return new Promise((resolve, reject) => {
      const server = https.createServer({ key: pems.private, cert: pems.cert }, app);
      server.listen(0, '0.0.0.0', () => {
        this.server = server;
        this.port = server.address().port;
        resolve();
      });
      server.on('error', reject);
    });
  }

  async createSession() {
    await this.ensureStarted();

    const lanAddress = getLanAddress();
    if (!lanAddress) {
      throw new Error("Aucune adresse réseau locale détectée. Vérifiez que l'ordinateur est connecté au Wi-Fi.");
    }

    const token = crypto.randomBytes(16).toString('hex');
    const expiresAt = Date.now() + SESSION_TTL_MS;
    this.sessions.set(token, { expiresAt });
    setTimeout(() => this.sessions.delete(token), SESSION_TTL_MS).unref();

    const url = `https://${lanAddress}:${this.port}/scan/${token}`;
    const qrDataUrl = await QRCode.toDataURL(url, { margin: 1, width: 320 });

    return { url, qrDataUrl, token, expiresInSeconds: SESSION_TTL_MS / 1000 };
  }

  stop() {
    if (this.server) {
      this.server.close();
      this.server = null;
    }
  }
}

module.exports = new MobileScanServer();
