# ServeHub Prestador — protótipo PWA

Protótipo navegável do **ServeHub Prestador**, empacotado como PWA instalável (site estático, sem build).

## O que é

Gerado a partir do protótipo do Claude Design `Prototipos/ServeHub App Prestador.html` (o arquivo original
**não** é editado — este repositório é uma cópia processada). Do bundle original foram removidos:

- a barra lateral de navegação do protótipo;
- a moldura de iPhone (bezel, dynamic island, status bar "9:41", home indicator);
- o Babel standalone (3,1 MB), que só era necessário para compilar a moldura em runtime.

React, ReactDOM, o runtime do Claude Design e as fontes Sora são servidos localmente —
**nenhuma requisição a CDN**, o app funciona offline depois da primeira visita.

## Estrutura

```
index.html                 app inteiro (template + lógica)
assets/dc-runtime.js       runtime do Claude Design
assets/vendor/             React 18.3.1 + ReactDOM (UMD)
assets/fonts/              Sora (woff2, latin + latin-ext)
icons/                     ícones PWA (192/512, maskable, apple-touch)
manifest.webmanifest       manifesto PWA
sw.js                      service worker (precache + offline)
vercel.json                headers de cache
```

## Rodar localmente

```bash
python3 -m http.server 8080
# abra http://localhost:8080
```

Service worker exige `localhost` ou HTTPS — abrir o `index.html` via `file://` não registra o SW.

## Deploy na Vercel

Importe este repositório em [vercel.com/new](https://vercel.com/new). É um site estático:

- Framework Preset: **Other**
- Build Command: *(vazio)*
- Output Directory: *(vazio / raiz)*

Cada push na `main` redeploya automaticamente.

## Atualizar o protótipo

Ao regerar o protótipo no Claude Design, rode novamente o script de build sobre o novo
`.html` e **incremente a constante `CACHE` em `sw.js`** — sem isso os visitantes que já
instalaram continuam vendo a versão antiga.

---

ServeHub · protótipo — não é o produto final.
