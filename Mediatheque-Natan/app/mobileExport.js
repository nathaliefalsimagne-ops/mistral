// Génère une page HTML autonome (données incluses, aucune requête réseau
// nécessaire à l'ouverture) listant la médiathèque avec recherche et
// filtres, plus les collections incomplètes - pensée pour être synchronisée
// sur un téléphone (iCloud Drive, Mail, AirDrop...) et consultée hors
// connexion, par exemple en boutique, loin du réseau Wi-Fi de la maison sur
// lequel tourne l'application.

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

const TYPE_LABELS = { 1: 'DVD', 2: 'Blu-ray', 3: 'CD' };

function generateExportHtml({ media, categories, collectionGaps, generatedAt }) {
  const dataJson = JSON.stringify({ media, categories, collectionGaps }).replace(/</g, '\\u003c');
  const generatedLabel = new Date(generatedAt).toLocaleString('fr-FR');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Médiathèque NATAN - Export mobile</title>
<style>
  :root {
    --accent: #D90429; --accent-light: #EF233C;
    --bg: #14152A; --bg-secondary: #1A1B2E; --bg-tertiary: #2B2D42;
    --text: #E9ECEF; --text-tertiary: #8D99AE; --border: #4A4D6A;
  }
  * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
  body {
    margin: 0; background: var(--bg); color: var(--text);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    padding-bottom: 32px;
  }
  header {
    position: sticky; top: 0; z-index: 10;
    background: var(--bg-secondary); padding: 16px; border-bottom: 1px solid var(--border);
  }
  h1 { font-size: 18px; margin: 0 0 4px; }
  .subtitle { font-size: 12px; color: var(--text-tertiary); margin: 0 0 12px; }
  .tabs { display: flex; gap: 8px; margin-bottom: 12px; }
  .tab {
    flex: 1; padding: 8px; text-align: center; border-radius: 8px; font-size: 14px;
    background: var(--bg-tertiary); border: none; color: var(--text); cursor: pointer;
  }
  .tab.active { background: var(--accent); color: #fff; }
  input[type="search"], select {
    width: 100%; padding: 10px 12px; margin-bottom: 8px; border-radius: 8px;
    border: 1px solid var(--border); background: var(--bg-tertiary); color: var(--text); font-size: 16px;
  }
  .filters-row { display: flex; gap: 8px; }
  .filters-row select { flex: 1; }
  main { padding: 12px 16px; }
  .count { font-size: 13px; color: var(--text-tertiary); margin: 4px 0 12px; }
  .card {
    background: var(--bg-secondary); border-radius: 10px; padding: 12px 14px; margin-bottom: 8px;
  }
  .card-title { font-weight: 600; font-size: 15px; }
  .card-meta { font-size: 12px; color: var(--text-tertiary); margin-top: 4px; }
  .badge {
    display: inline-block; font-size: 11px; padding: 2px 8px; border-radius: 999px;
    background: var(--bg-tertiary); color: var(--text-tertiary); margin-right: 4px;
  }
  .gap-card { background: var(--bg-secondary); border-radius: 10px; padding: 14px; margin-bottom: 10px; }
  .gap-title { font-weight: 600; margin-bottom: 8px; }
  .gap-chip {
    display: inline-block; background: var(--bg-tertiary); border-radius: 8px;
    padding: 6px 10px; font-size: 13px; margin: 0 6px 6px 0;
  }
  .empty { text-align: center; color: var(--text-tertiary); padding: 32px 16px; }
  [hidden] { display: none !important; }
</style>
</head>
<body>
<header>
  <h1>📼 Médiathèque NATAN</h1>
  <p class="subtitle">Export du ${escapeHtml(generatedLabel)} - hors connexion</p>
  <div class="tabs">
    <button class="tab active" data-tab="library">Ma médiathèque</button>
    <button class="tab" data-tab="gaps">Collections à compléter</button>
  </div>
  <div id="library-controls">
    <input type="search" id="search" placeholder="Rechercher un titre... (avant d'acheter, vérifiez ici)">
    <div class="filters-row">
      <select id="type-filter">
        <option value="">Tous les types</option>
        <option value="1">DVD</option>
        <option value="2">Blu-ray</option>
        <option value="3">CD</option>
      </select>
      <select id="category-filter">
        <option value="">Toutes les catégories</option>
      </select>
    </div>
  </div>
</header>
<main>
  <div id="library-view">
    <p class="count" id="library-count"></p>
    <div id="library-list"></div>
  </div>
  <div id="gaps-view" hidden>
    <div id="gaps-list"></div>
  </div>
</main>

<script>
const DATA = ${dataJson};
const TYPE_LABELS = ${JSON.stringify(TYPE_LABELS)};

const searchInput = document.getElementById('search');
const typeFilter = document.getElementById('type-filter');
const categoryFilter = document.getElementById('category-filter');
const libraryList = document.getElementById('library-list');
const libraryCount = document.getElementById('library-count');
const gapsList = document.getElementById('gaps-list');
const libraryView = document.getElementById('library-view');
const gapsView = document.getElementById('gaps-view');
const libraryControls = document.getElementById('library-controls');
const tabs = document.querySelectorAll('.tab');

DATA.categories.forEach((name) => {
  const opt = document.createElement('option');
  opt.value = name;
  opt.textContent = name;
  categoryFilter.appendChild(opt);
});

function renderLibrary() {
  const q = searchInput.value.trim().toLowerCase();
  const type = typeFilter.value;
  const category = categoryFilter.value;

  const filtered = DATA.media.filter((m) => {
    if (q) {
      const inTitle = m.title.toLowerCase().includes(q) ||
        (m.original_title || '').toLowerCase().includes(q);
      if (!inTitle) return false;
    }
    if (type && String(m.type_id) !== type) return false;
    if (category && !m.categories.includes(category)) return false;
    return true;
  });

  libraryCount.textContent = filtered.length + ' média(s)' + (q || type || category ? ' trouvé(s)' : ' au total');

  if (filtered.length === 0) {
    libraryList.innerHTML = '<div class="empty">Aucun média ne correspond.</div>';
    return;
  }

  libraryList.innerHTML = filtered.map((m) => {
    const badges = m.categories.map((c) => '<span class="badge">' + escapeHtmlClient(c) + '</span>').join('');
    return '<div class="card">' +
      '<div class="card-title">' + escapeHtmlClient(m.title) + '</div>' +
      '<div class="card-meta">' + (TYPE_LABELS[m.type_id] || '') + (m.release_year ? ' • ' + m.release_year : '') + '</div>' +
      (badges ? '<div class="card-meta">' + badges + '</div>' : '') +
      '</div>';
  }).join('');
}

function renderGaps() {
  if (DATA.collectionGaps.length === 0) {
    gapsList.innerHTML = '<div class="empty">Toutes vos collections sont complètes (ou aucune collection détectée lors de cet export).</div>';
    return;
  }
  gapsList.innerHTML = DATA.collectionGaps.map((gap) => {
    const chips = gap.missing.map((f) =>
      '<span class="gap-chip">' + escapeHtmlClient(f.title) + (f.release_year ? ' (' + f.release_year + ')' : '') + '</span>'
    ).join('');
    return '<div class="gap-card">' +
      '<div class="gap-title">' + escapeHtmlClient(gap.collectionName) + ' - il manque ' + gap.missing.length + '</div>' +
      chips +
      '</div>';
  }).join('');
}

function escapeHtmlClient(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

searchInput.addEventListener('input', renderLibrary);
typeFilter.addEventListener('change', renderLibrary);
categoryFilter.addEventListener('change', renderLibrary);

tabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    tabs.forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');
    const isLibrary = tab.dataset.tab === 'library';
    libraryView.hidden = !isLibrary;
    gapsView.hidden = isLibrary;
    libraryControls.hidden = !isLibrary;
  });
});

renderLibrary();
renderGaps();
</script>
</body>
</html>`;
}

module.exports = { generateExportHtml };
