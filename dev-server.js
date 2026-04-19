require('dotenv').config();
const http = require('http');
const fs = require('fs');
const path = require('path');
const artists = require('./artists.json');

const PORT = process.env.PORT || 3000;

function placeholderSVG(title, color = '#1a1a2e') {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="450">
      <defs>
        <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${color};stop-opacity:1"/>
          <stop offset="100%" style="stop-color:#16213e;stop-opacity:1"/>
        </linearGradient>
      </defs>
      <rect width="600" height="450" fill="url(#g)"/>
      <rect x="60" y="60" width="480" height="330" fill="none" stroke="#c9a84c" stroke-width="1" opacity="0.3"/>
      <text x="300" y="200" text-anchor="middle" fill="#c9a84c" font-size="14" font-family="Georgia,serif" opacity="0.7">🖼</text>
      <text x="300" y="240" text-anchor="middle" fill="#e8c96d" font-size="16" font-family="Georgia,serif" font-style="italic">${title}</text>
      <text x="300" y="270" text-anchor="middle" fill="#888" font-size="11" font-family="Arial,sans-serif">Prévia — execute npm run build para imagem real</text>
    </svg>`
  )}`;
}

function buildPreviewHTML() {
  const { buildHTML } = require('./build.js');
  // build.js não exporta buildHTML diretamente; montamos inline aqui
  return null;
}

function generateDevHTML() {
  const results = {};
  for (const artist of artists) {
    results[artist.id] = {
      ...artist,
      slides: artist.slides.map(slide => ({
        ...slide,
        base64: placeholderSVG(slide.title),
      })),
    };
  }
  return buildGalleryHTML(results);
}

function buildGalleryHTML(results) {
  const artistsData = Object.values(results);

  const artistCards = artistsData.map(artist => {
    const slides = artist.slides.map((slide, sIdx) => `
      <div class="slide ${sIdx === 0 ? 'active' : ''}" data-index="${sIdx}">
        <img src="${slide.base64}" alt="${slide.title}" />
        <div class="slide-caption">
          <span class="slide-title">${slide.title}</span>
          <span class="slide-year">${slide.year}</span>
        </div>
      </div>`).join('');

    const dots = artist.slides.map((_, sIdx) =>
      `<button class="dot ${sIdx === 0 ? 'active' : ''}" data-slide="${sIdx}" aria-label="Obra ${sIdx + 1}"></button>`
    ).join('');

    return `
    <article class="artist-card" data-artist="${artist.id}">
      <div class="carousel" id="carousel-${artist.id}">
        <div class="slides-wrapper">${slides}</div>
        <button class="nav prev" aria-label="Anterior">&#8249;</button>
        <button class="nav next" aria-label="Próximo">&#8250;</button>
        <div class="dots">${dots}</div>
      </div>
      <div class="artist-info">
        <div class="artist-header">
          <div>
            <h2 class="artist-name">${artist.name}</h2>
            <p class="artist-meta">${artist.nationality} · ${artist.years}</p>
            <span class="style-badge">${artist.style}</span>
          </div>
        </div>
        <p class="artist-bio">${artist.bio}</p>
      </div>
    </article>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Galeria de Artistas — DEV</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --bg: #0d0d0d; --surface: #171717; --border: #2a2a2a;
      --gold: #c9a84c; --gold-light: #e8c96d; --text: #f0ece4;
      --text-muted: #888; --radius: 12px;
    }
    html { scroll-behavior: smooth; }
    body { background: var(--bg); color: var(--text); font-family: 'Georgia','Times New Roman',serif; min-height: 100vh; }

    .dev-banner {
      background: linear-gradient(90deg, #1a1a00, #2a2000, #1a1a00);
      border-bottom: 1px solid var(--gold);
      color: var(--gold-light);
      font-family: monospace;
      font-size: 0.78rem;
      padding: 8px 24px;
      text-align: center;
      letter-spacing: 0.5px;
    }
    .dev-banner strong { color: #fff; }

    header { text-align: center; padding: 50px 24px 36px; border-bottom: 1px solid var(--border); background: linear-gradient(180deg,#111 0%,var(--bg) 100%); }
    header .eyebrow { font-family: 'Helvetica Neue',Arial,sans-serif; font-size: 11px; letter-spacing: 4px; text-transform: uppercase; color: var(--gold); margin-bottom: 16px; }
    header h1 { font-size: clamp(2rem,5vw,3.5rem); font-weight: 400; margin-bottom: 12px; }
    header h1 em { color: var(--gold-light); font-style: italic; }
    header p { font-size: 1rem; color: var(--text-muted); max-width: 500px; margin: 0 auto; line-height: 1.7; }

    main { max-width: 1200px; margin: 0 auto; padding: 48px 24px 80px; }
    .gallery-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(520px, 1fr)); gap: 40px; }
    @media (max-width: 600px) { .gallery-grid { grid-template-columns: 1fr; gap: 28px; } }

    .artist-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; transition: transform .3s, box-shadow .3s; }
    .artist-card:hover { transform: translateY(-4px); box-shadow: 0 16px 48px rgba(0,0,0,.6); }

    .carousel { position: relative; width: 100%; aspect-ratio: 4/3; overflow: hidden; background: #111; }
    .slides-wrapper { width: 100%; height: 100%; position: relative; }
    .slide { position: absolute; inset: 0; opacity: 0; transition: opacity .5s; display: flex; align-items: center; justify-content: center; }
    .slide.active { opacity: 1; }
    .slide img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .slide-caption { position: absolute; bottom: 0; left: 0; right: 0; padding: 32px 20px 16px; background: linear-gradient(0deg,rgba(0,0,0,.85) 0%,transparent 100%); display: flex; justify-content: space-between; align-items: flex-end; }
    .slide-title { font-size: 1rem; font-style: italic; color: #fff; }
    .slide-year { font-family: 'Helvetica Neue',Arial,sans-serif; font-size: .75rem; color: var(--gold-light); letter-spacing: 1px; }

    .nav { position: absolute; top: 50%; transform: translateY(-50%); background: rgba(0,0,0,.55); border: 1px solid rgba(255,255,255,.15); color: #fff; font-size: 1.8rem; width: 40px; height: 40px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background .2s; z-index: 10; }
    .nav:hover { background: rgba(201,168,76,.7); }
    .nav.prev { left: 12px; }
    .nav.next { right: 12px; }

    .dots { position: absolute; bottom: 12px; left: 50%; transform: translateX(-50%); display: flex; gap: 6px; z-index: 10; }
    .dot { width: 8px; height: 8px; border-radius: 50%; background: rgba(255,255,255,.35); border: none; cursor: pointer; transition: background .2s, transform .2s; }
    .dot.active { background: var(--gold-light); transform: scale(1.3); }

    .artist-info { padding: 24px; }
    .artist-header { margin-bottom: 16px; }
    .artist-name { font-size: 1.5rem; font-weight: 400; margin-bottom: 4px; }
    .artist-meta { font-family: 'Helvetica Neue',Arial,sans-serif; font-size: .8rem; color: var(--text-muted); letter-spacing: .5px; margin-bottom: 10px; }
    .style-badge { display: inline-block; font-family: 'Helvetica Neue',Arial,sans-serif; font-size: .7rem; letter-spacing: 1.5px; text-transform: uppercase; color: var(--gold); border: 1px solid var(--gold); padding: 3px 10px; border-radius: 20px; }
    .artist-bio { font-size: .9rem; line-height: 1.75; color: #bbb; margin-top: 12px; }

    footer { text-align: center; padding: 32px 24px; border-top: 1px solid var(--border); font-family: 'Helvetica Neue',Arial,sans-serif; font-size: .75rem; color: var(--text-muted); letter-spacing: 1px; }
    footer strong { color: var(--gold); }
  </style>
</head>
<body>
  <div class="dev-banner">
    ⚡ <strong>MODO DEV</strong> — Imagens são placeholders · Execute <code>npm run build</code> para gerar a galeria final com imagens reais via Bright Data
  </div>

  <header>
    <p class="eyebrow">Connectoway · Arte &amp; Cultura</p>
    <h1>Galeria de <em>Artistas</em></h1>
    <p>Uma curadoria de obras-primas da arte ocidental — do Impressionismo ao Simbolismo.</p>
  </header>

  <main>
    <div class="gallery-grid">${artistCards}</div>
  </main>

  <footer>
    <p><strong>Connectoway</strong> · Galeria de Artistas · ${new Date().getFullYear()}</p>
    <p style="margin-top:6px">Imagens de domínio público · Wikimedia Commons</p>
  </footer>

  <script>
    document.querySelectorAll('.carousel').forEach(carousel => {
      const slides = carousel.querySelectorAll('.slide');
      const dots = carousel.querySelectorAll('.dot');
      let current = 0;

      function goTo(n) {
        slides[current].classList.remove('active');
        dots[current].classList.remove('active');
        current = (n + slides.length) % slides.length;
        slides[current].classList.add('active');
        dots[current].classList.add('active');
      }

      carousel.querySelector('.prev').addEventListener('click', () => goTo(current - 1));
      carousel.querySelector('.next').addEventListener('click', () => goTo(current + 1));
      dots.forEach((dot, i) => dot.addEventListener('click', () => goTo(i)));

      let timer = setInterval(() => goTo(current + 1), 4000);
      carousel.addEventListener('mouseenter', () => clearInterval(timer));
      carousel.addEventListener('mouseleave', () => { timer = setInterval(() => goTo(current + 1), 4000); });

      carousel.addEventListener('touchstart', e => { carousel._startX = e.touches[0].clientX; });
      carousel.addEventListener('touchend', e => {
        const diff = carousel._startX - e.changedTouches[0].clientX;
        if (Math.abs(diff) > 40) goTo(diff > 0 ? current + 1 : current - 1);
      });
    });

    // Live reload via SSE
    const es = new EventSource('/sse');
    es.onmessage = () => location.reload();
  </script>
</body>
</html>`;
}

// SSE clients for live reload
const sseClients = new Set();

function watchFiles() {
  const watched = ['artists.json', 'dev-server.js'];
  watched.forEach(f => {
    fs.watch(path.join(__dirname, f), () => {
      console.log(`  ↻ ${f} alterado — recarregando...`);
      sseClients.forEach(res => res.write('data: reload\n\n'));
    });
  });
}

const server = http.createServer((req, res) => {
  if (req.url === '/sse') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });
    sseClients.add(res);
    req.on('close', () => sseClients.delete(res));
    return;
  }

  if (req.url === '/galeria_final.html' && fs.existsSync(path.join(__dirname, 'galeria_final.html'))) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    fs.createReadStream(path.join(__dirname, 'galeria_final.html')).pipe(res);
    return;
  }

  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(generateDevHTML());
});

server.listen(PORT, () => {
  console.log('\n🎨 Galeria de Artistas — Servidor de Desenvolvimento');
  console.log(`\n   ➜  http://localhost:${PORT}\n`);
  console.log('   Modo: prévia com placeholders (sem proxy)');
  console.log('   Após npm run build, acesse /galeria_final.html\n');
  console.log('   Pressione Ctrl+C para encerrar\n');
  watchFiles();
});
