require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { downloadImage } = require('./downloader');
const artists = require('./artists.json');

const WIKIMEDIA_FALLBACK_BASE = 'https://commons.wikimedia.org/wiki/Special:FilePath/';
const DELAY_BETWEEN_REQUESTS_MS = 500;

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function placeholderSVG(title) {
  const encoded = encodeURIComponent(title);
  return `data:image/svg+xml;charset=UTF-8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='600'><rect width='600' height='600' fill='%23222'/><text x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23888' font-size='22' font-family='sans-serif'>${encoded}</text></svg>`;
}

async function build() {
  console.log('🎨 Iniciando build da Galeria de Artistas...\n');

  const results = {};
  let totalOk = 0;
  let totalFail = 0;

  for (const artist of artists) {
    console.log(`\n► ${artist.name}`);
    results[artist.id] = { ...artist, slides: [] };

    for (const slide of artist.slides) {
      process.stdout.write(`  ↳ ${slide.title} (${slide.year})... `);
      try {
        const b64 = await downloadImage(slide.url);
        results[artist.id].slides.push({ ...slide, base64: b64 });
        console.log('✅');
        totalOk++;
      } catch (err) {
        console.log(`❌ ${err.message}`);
        results[artist.id].slides.push({ ...slide, base64: placeholderSVG(slide.title) });
        totalFail++;
      }
      await sleep(DELAY_BETWEEN_REQUESTS_MS);
    }
  }

  console.log(`\n📊 Resultado: ${totalOk} imagens baixadas, ${totalFail} falhas`);
  console.log('🔧 Gerando galeria_final.html...');

  const html = buildHTML(results);
  const outPath = path.join(__dirname, 'galeria_final.html');
  fs.writeFileSync(outPath, html, 'utf-8');

  const sizeMB = (fs.statSync(outPath).size / 1024 / 1024).toFixed(2);
  console.log(`✅ galeria_final.html gerado! (${sizeMB} MB)`);
}

function buildHTML(results) {
  const artistsData = Object.values(results);

  const artistCards = artistsData.map((artist, idx) => {
    const slides = artist.slides.map((slide, sIdx) => `
      <div class="slide ${sIdx === 0 ? 'active' : ''}" data-index="${sIdx}">
        <img src="${slide.base64}" alt="${slide.title}" loading="lazy" />
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
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Galeria de Artistas — Connectoway</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --bg: #0d0d0d;
      --surface: #171717;
      --surface2: #1f1f1f;
      --border: #2a2a2a;
      --gold: #c9a84c;
      --gold-light: #e8c96d;
      --text: #f0ece4;
      --text-muted: #888;
      --radius: 12px;
    }

    html { scroll-behavior: smooth; }

    body {
      background: var(--bg);
      color: var(--text);
      font-family: 'Georgia', 'Times New Roman', serif;
      min-height: 100vh;
    }

    /* ── Header ── */
    header {
      text-align: center;
      padding: 60px 24px 40px;
      border-bottom: 1px solid var(--border);
      background: linear-gradient(180deg, #111 0%, var(--bg) 100%);
    }

    header .eyebrow {
      font-family: 'Helvetica Neue', Arial, sans-serif;
      font-size: 11px;
      letter-spacing: 4px;
      text-transform: uppercase;
      color: var(--gold);
      margin-bottom: 16px;
    }

    header h1 {
      font-size: clamp(2rem, 5vw, 3.5rem);
      font-weight: 400;
      color: var(--text);
      letter-spacing: 0.02em;
      margin-bottom: 12px;
    }

    header h1 em {
      color: var(--gold-light);
      font-style: italic;
    }

    header p {
      font-size: 1rem;
      color: var(--text-muted);
      max-width: 500px;
      margin: 0 auto;
      line-height: 1.7;
    }

    /* ── Gallery Grid ── */
    main {
      max-width: 1200px;
      margin: 0 auto;
      padding: 48px 24px 80px;
    }

    .gallery-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(520px, 1fr));
      gap: 40px;
    }

    @media (max-width: 600px) {
      .gallery-grid { grid-template-columns: 1fr; gap: 28px; }
    }

    /* ── Artist Card ── */
    .artist-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      overflow: hidden;
      transition: transform 0.3s ease, box-shadow 0.3s ease;
    }

    .artist-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 16px 48px rgba(0,0,0,0.6);
    }

    /* ── Carousel ── */
    .carousel {
      position: relative;
      width: 100%;
      aspect-ratio: 4 / 3;
      overflow: hidden;
      background: #111;
    }

    .slides-wrapper {
      width: 100%;
      height: 100%;
      position: relative;
    }

    .slide {
      position: absolute;
      inset: 0;
      opacity: 0;
      transition: opacity 0.5s ease;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .slide.active { opacity: 1; }

    .slide img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .slide-caption {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      padding: 32px 20px 16px;
      background: linear-gradient(0deg, rgba(0,0,0,0.85) 0%, transparent 100%);
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }

    .slide-title {
      font-size: 1rem;
      font-style: italic;
      color: #fff;
    }

    .slide-year {
      font-family: 'Helvetica Neue', Arial, sans-serif;
      font-size: 0.75rem;
      color: var(--gold-light);
      letter-spacing: 1px;
    }

    .nav {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      background: rgba(0,0,0,0.55);
      border: 1px solid rgba(255,255,255,0.15);
      color: #fff;
      font-size: 1.8rem;
      line-height: 1;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.2s;
      z-index: 10;
    }

    .nav:hover { background: rgba(201,168,76,0.7); }
    .nav.prev { left: 12px; }
    .nav.next { right: 12px; }

    .dots {
      position: absolute;
      bottom: 12px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      gap: 6px;
      z-index: 10;
    }

    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: rgba(255,255,255,0.35);
      border: none;
      cursor: pointer;
      transition: background 0.2s, transform 0.2s;
    }

    .dot.active {
      background: var(--gold-light);
      transform: scale(1.3);
    }

    /* ── Artist Info ── */
    .artist-info {
      padding: 24px;
    }

    .artist-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      margin-bottom: 16px;
    }

    .artist-name {
      font-size: 1.5rem;
      font-weight: 400;
      letter-spacing: 0.01em;
      margin-bottom: 4px;
    }

    .artist-meta {
      font-family: 'Helvetica Neue', Arial, sans-serif;
      font-size: 0.8rem;
      color: var(--text-muted);
      letter-spacing: 0.5px;
      margin-bottom: 10px;
    }

    .style-badge {
      display: inline-block;
      font-family: 'Helvetica Neue', Arial, sans-serif;
      font-size: 0.7rem;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      color: var(--gold);
      border: 1px solid var(--gold);
      padding: 3px 10px;
      border-radius: 20px;
    }

    .artist-bio {
      font-size: 0.9rem;
      line-height: 1.75;
      color: #bbb;
    }

    /* ── Footer ── */
    footer {
      text-align: center;
      padding: 32px 24px;
      border-top: 1px solid var(--border);
      font-family: 'Helvetica Neue', Arial, sans-serif;
      font-size: 0.75rem;
      color: var(--text-muted);
      letter-spacing: 1px;
    }

    footer strong { color: var(--gold); }

    /* ── Modal ── */
    .modal-overlay {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.92);
      z-index: 1000;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }

    .modal-overlay.open { display: flex; }

    .modal-content {
      max-width: 90vw;
      max-height: 90vh;
      position: relative;
    }

    .modal-content img {
      max-width: 90vw;
      max-height: 85vh;
      object-fit: contain;
      border-radius: 8px;
      box-shadow: 0 24px 80px rgba(0,0,0,0.8);
    }

    .modal-close {
      position: absolute;
      top: -16px;
      right: -16px;
      background: var(--gold);
      color: #000;
      border: none;
      border-radius: 50%;
      width: 36px;
      height: 36px;
      font-size: 1.2rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
    }
  </style>
</head>
<body>

  <header>
    <p class="eyebrow">Connectoway · Arte &amp; Cultura</p>
    <h1>Galeria de <em>Artistas</em></h1>
    <p>Uma curadoria de obras-primas da arte ocidental — do Impressionismo ao Simbolismo, reunidas em um só lugar.</p>
  </header>

  <main>
    <div class="gallery-grid">
      ${artistCards}
    </div>
  </main>

  <footer>
    <p><strong>Connectoway</strong> · Galeria de Artistas · ${new Date().getFullYear()}</p>
    <p style="margin-top:6px">Imagens de domínio público · Wikimedia Commons</p>
  </footer>

  <!-- Modal para zoom -->
  <div class="modal-overlay" id="modal" role="dialog" aria-modal="true">
    <div class="modal-content">
      <button class="modal-close" id="modal-close" aria-label="Fechar">✕</button>
      <img id="modal-img" src="" alt="" />
    </div>
  </div>

  <script>
    // Carousel logic
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

      // Auto-advance
      let timer = setInterval(() => goTo(current + 1), 4000);
      carousel.addEventListener('mouseenter', () => clearInterval(timer));
      carousel.addEventListener('mouseleave', () => {
        timer = setInterval(() => goTo(current + 1), 4000);
      });

      // Swipe support
      let startX = 0;
      carousel.addEventListener('touchstart', e => { startX = e.touches[0].clientX; });
      carousel.addEventListener('touchend', e => {
        const diff = startX - e.changedTouches[0].clientX;
        if (Math.abs(diff) > 40) goTo(diff > 0 ? current + 1 : current - 1);
      });

      // Click to zoom
      carousel.querySelectorAll('.slide img').forEach(img => {
        img.style.cursor = 'zoom-in';
        img.addEventListener('click', () => {
          document.getElementById('modal-img').src = img.src;
          document.getElementById('modal-img').alt = img.alt;
          document.getElementById('modal').classList.add('open');
        });
      });
    });

    // Modal close
    document.getElementById('modal-close').addEventListener('click', closeModal);
    document.getElementById('modal').addEventListener('click', e => {
      if (e.target === document.getElementById('modal')) closeModal();
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
    function closeModal() {
      document.getElementById('modal').classList.remove('open');
    }
  </script>

</body>
</html>`;
}

build().catch(err => {
  console.error('\n❌ Erro fatal:', err.message);
  process.exit(1);
});
