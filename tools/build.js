#!/usr/bin/env node
// Regenera este site a partir do protótipo exportado do Claude Design.
//
//   node tools/build.js "/caminho/para/ServeHub App Prestador.html"
//
// O .html de origem NÃO é modificado. Depois de rodar, incremente a constante
// CACHE em sw.js — sem isso, quem já instalou o PWA continua na versão antiga.

const fs = require('fs'), zlib = require('zlib'), path = require('path');

const APP = {
  name: "ServeHub Prestador",
  short: "Prestador",
  desc: "App do prestador de serviços ServeHub — protótipo navegável.",
  theme: '#16a34a',
  bg: '#eef2ee',
};

const src = process.argv[2];
if (!src) {
  console.error('uso: node tools/build.js "<caminho do .html do protótipo>"');
  process.exit(1);
}
const ROOT = path.resolve(__dirname, '..');
const html = fs.readFileSync(src, 'utf8');

const block = (type) => {
  const m = html.match(new RegExp('<script type="' + type + '">([\\s\\S]*?)</script>'));
  if (!m) throw new Error('bloco ausente no bundle: ' + type);
  return m[1];
};

const manifest = JSON.parse(block('__bundler/manifest'));
const ext = JSON.parse(block('__bundler/ext_resources'));
let tpl = JSON.parse(block('__bundler/template'));

fs.mkdirSync(path.join(ROOT, 'assets/fonts'), { recursive: true });
fs.mkdirSync(path.join(ROOT, 'assets/vendor'), { recursive: true });

const uuidByUrl = Object.fromEntries(ext.map(e => [e.id, e.uuid]));
const vendorName = {
  [uuidByUrl['https://unpkg.com/react@18.3.1/umd/react.production.min.js']]: 'react.production.min.js',
  [uuidByUrl['https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js']]: 'react-dom.production.min.js',
};

// 1. Materializa os recursos embutidos no bundle como arquivos reais.
//    O Babel standalone (3,1 MB) e o ios-frame.jsx ficam de fora: só existiam
//    para compilar a moldura de iPhone em runtime, e ela é removida no passo 3.
const pathByUuid = {};
let fontN = 0;
for (const [uuid, r] of Object.entries(manifest)) {
  const buf = r.compressed ? zlib.gunzipSync(Buffer.from(r.data, 'base64')) : Buffer.from(r.data, 'base64');
  let rel;
  if (vendorName[uuid]) rel = 'assets/vendor/' + vendorName[uuid];
  else if (r.mime === 'font/woff2') rel = 'assets/fonts/sora-' + (++fontN) + '.woff2';
  else if (r.mime === 'text/javascript' && buf.includes('GENERATED from dc-runtime')) rel = 'assets/dc-runtime.js';
  else continue;
  fs.writeFileSync(path.join(ROOT, rel), buf);
  pathByUuid[uuid] = rel;
}

// 2. Referências por uuid viram caminhos locais.
for (const [uuid, rel] of Object.entries(pathByUuid)) tpl = tpl.split(uuid).join(rel);

// 3. Remove a moldura de apresentação: rail lateral de 250px, o <main> que
//    centraliza, e o <x-import IOSDevice> (bezel, dynamic island, status bar
//    "9:41", home indicator).
const shellStart = tpl.indexOf('<div style="min-height:100vh;display:flex;align-items:stretch">');
const importOpen = tpl.indexOf('<x-import', shellStart);
const importOpenEnd = tpl.indexOf('>', tpl.indexOf('hint-size', importOpen)) + 1;
const tail = '</x-import>\n</main>\n</div>';
const tailAt = tpl.indexOf(tail);
if (shellStart < 0 || importOpen < 0 || tailAt < 0) throw new Error('moldura não localizada — o formato do bundle mudou?');
tpl = tpl.slice(0, shellStart) + '<div class="sh-app">' + tpl.slice(importOpenEnd, tailAt) + '</div>' + tpl.slice(tailAt + tail.length);

// 3b. As barras inferiores (tab bar, campo do chat, botões de CTA) traziam folga
//     fixa embaixo para escapar do home indicator DESENHADO na moldura. Sem a
//     moldura isso vira um vão morto, com os ícones flutuando acima da borda.
//     env(safe-area-inset-bottom) dá zero num aparelho sem barra de gestos e a
//     medida exata num que tenha.
const BARRAS = {
  'padding:8px 6px 26px':   'padding:8px 6px calc(8px + env(safe-area-inset-bottom))',
  'padding:10px 14px 28px': 'padding:10px 14px calc(10px + env(safe-area-inset-bottom))',
  'padding:8px 20px 28px':  'padding:8px 20px calc(10px + env(safe-area-inset-bottom))',
  'padding:12px 16px 30px': 'padding:12px 16px calc(12px + env(safe-area-inset-bottom))',
  'padding:12px 20px 30px': 'padding:12px 20px calc(12px + env(safe-area-inset-bottom))',
};
let barras = 0;
for (const [de, para] of Object.entries(BARRAS)) {
  const n = tpl.split(de).length - 1;
  if (n) { tpl = tpl.split(de).join(para); barras += n; }
}

// 4. Cabeçalho PWA. O dc-runtime resolve React/ReactDOM pelo window.__resources,
//    então nada é buscado em CDN e o app funciona offline.
const head = `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1, user-scalable=no">
<title>${APP.name}</title>
<meta name="description" content="${APP.desc}">
<meta name="theme-color" content="${APP.theme}">
<link rel="manifest" href="./manifest.webmanifest">
<link rel="icon" href="./icons/favicon-32.png" sizes="32x32">
<link rel="apple-touch-icon" href="./icons/apple-touch-icon.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="${APP.short}">
<style>
  html,body{height:100%;margin:0;background:${APP.bg};overscroll-behavior:none}
  body{-webkit-font-smoothing:antialiased;-webkit-tap-highlight-color:transparent}
  /* Viewport do app: tela cheia no celular, coluna centrada no desktop. */
  .sh-app{height:100dvh;display:flex;flex-direction:column;background:#f6f8f6}
  .sh-app>*{flex:1;min-height:0}
  @supports not (height:100dvh){.sh-app{height:100vh}}
  @media (min-width:520px){
    body{display:flex;align-items:center;justify-content:center}
    .sh-app{width:430px;height:min(920px,100dvh);border-radius:22px;overflow:hidden;
            box-shadow:0 18px 50px rgba(12,75,37,.14)}
  }
</style>
<script>
  // O dc-runtime resolve React/ReactDOM por este mapa em vez de ir ao unpkg.
  window.__resources = {
    "https://unpkg.com/react@18.3.1/umd/react.production.min.js": "./assets/vendor/react.production.min.js",
    "https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js": "./assets/vendor/react-dom.production.min.js"
  };
<\/script>`;

tpl = tpl.replace('<meta name="viewport" content="width=device-width, initial-scale=1">', head);
tpl = tpl.replace('</body>', `<script>
  if ('serviceWorker' in navigator) {
    addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(console.warn));
  }
<\/script>
</body>`);

fs.writeFileSync(path.join(ROOT, 'index.html'), tpl);
console.log('index.html gerado —', (tpl.length / 1024).toFixed(0) + ' kB,', barras, 'barras inferiores ajustadas');
console.log('Lembre de incrementar CACHE em sw.js antes do deploy.');
