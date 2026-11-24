import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const stepName = process.argv[2] || 'step0';
const outDir = path.join(rootDir, 'screenshots', stepName);

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

class CDPClient {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.id = 1;
    this.callbacks = new Map();

    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.callbacks.has(msg.id)) {
        const { resolve, reject } = this.callbacks.get(msg.id);
        this.callbacks.delete(msg.id);
        if (msg.error) reject(msg.error);
        else resolve(msg.result);
      }
    };
  }

  ready() {
    return new Promise((resolve) => {
      if (this.ws.readyState === WebSocket.OPEN) resolve();
      else this.ws.onopen = () => resolve();
    });
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.id++;
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    this.ws.close();
  }
}

async function main() {
  console.log(`Starting Vite server for screenshots on port 3100 (Step: ${stepName})...`);
  const vite = spawn('cmd.exe', ['/c', 'npx', 'vite', '--port', '3100'], {
    cwd: rootDir,
    stdio: 'ignore',
  });

  await sleep(2500);

  const udir = path.join(os.tmpdir(), 'fb-chrome-' + Date.now());
  const chrome = spawn(
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    [
      '--headless=new',
      '--remote-debugging-port=9222',
      '--user-data-dir=' + udir,
      '--disable-gpu',
      '--no-sandbox',
      'about:blank',
    ],
    { stdio: 'ignore' }
  );

  await sleep(2000);

  const tabs = await fetchJson('http://127.0.0.1:9222/json');
  const pageTab = tabs.find((t) => t.type === 'page') || tabs[0];

  const client = new CDPClient(pageTab.webSocketDebuggerUrl);
  await client.ready();

  await client.send('Page.enable');
  await client.send('Runtime.enable');

  await client.send('Page.navigate', { url: 'http://localhost:3100' });
  await sleep(2000);

  const viewports = [
    { width: 375, height: 812, name: '375px' },
    { width: 768, height: 1024, name: '768px' },
    { width: 1280, height: 800, name: '1280px' },
  ];

  const views = [
    { name: 'landing', roleText: 'Public Landing' },
    { name: 'donor', roleText: 'Donor' },
    { name: 'ngo', roleText: 'NGO' },
    { name: 'volunteer', roleText: 'Volunteer' },
  ];

  for (const vp of viewports) {
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: vp.width,
      height: vp.height,
      deviceScaleFactor: 1,
      mobile: vp.width < 768,
    });
    await sleep(400);

    for (const v of views) {
      await client.send('Runtime.evaluate', {
        expression: `
          (() => {
            const btns = Array.from(document.querySelectorAll('button'));
            const target = btns.find(b => b.textContent && b.textContent.trim().includes('${v.roleText}'));
            if (target) {
              target.click();
              return 'clicked';
            }
            return 'not found';
          })()
        `,
      });

      await sleep(800);

      const shot = await client.send('Page.captureScreenshot', {
        format: 'png',
        clip: {
          x: 0,
          y: 0,
          width: vp.width,
          height: vp.height,
          scale: 1,
        },
      });

      const fileName = `${v.name}-${vp.name}.png`;
      const filePath = path.join(outDir, fileName);
      fs.writeFileSync(filePath, Buffer.from(shot.data, 'base64'));
    }
  }

  client.close();
  chrome.kill();
  vite.kill();

  console.log(`All 12 screenshots captured in screenshots/${stepName}/`);
}

main().catch((err) => {
  console.error('Screenshot error:', err);
  process.exit(1);
});
