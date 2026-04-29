'use strict';

// --- ONGLETS ---
document.querySelectorAll('.tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(s => s.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
  });
});

// --- ACTUALITÉS ---
async function loadActu() {
  try {
    const res = await fetch('/api/latest');
    const data = await res.json();
    renderActu(data);
  } catch {
    document.getElementById('days-container').innerHTML = `
      <div class="empty-state">
        <div class="emoji">📡</div>
        <p>Impossible de charger les données.<br>Clique sur ↻ pour lancer une mise à jour.</p>
      </div>`;
  }
}

function formatDate(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch { return ''; }
}

function formatDateShort(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  } catch { return ''; }
}

function catClass(c) {
  const map = { militaire: 'cat-militaire', economique: 'cat-economique', diplomatique: 'cat-diplomatique', maritime: 'cat-maritime' };
  return map[c] || 'cat-maritime';
}

function catLabel(c) {
  const map = { militaire: '⚔️ Militaire', economique: '📈 Économique', diplomatique: '🤝 Diplomatique', maritime: '🚢 Maritime' };
  return map[c] || '🌊 Maritime';
}

function renderActu(data) {
  // Prix WTI
  const today = (data.days || [])[0];
  if (today?.petrole?.prix_wti) {
    document.getElementById('wti-price').textContent = today.petrole.prix_wti.toFixed(2);
    const chgEl = document.getElementById('wti-change');
    const v = today.petrole.variation_wti;
    if (v != null) {
      chgEl.textContent = (v >= 0 ? '+' : '') + v.toFixed(2) + '%';
      chgEl.className = 'stat-chg ' + (v >= 0 ? 'up' : 'down');
    }
  }

  // Update bar
  const upEl = document.getElementById('last-update');
  if (data.lastUpdate) {
    upEl.textContent = 'Mis à jour ' + formatDate(data.lastUpdate);
  } else {
    upEl.textContent = 'Aucune mise à jour';
  }

  const container = document.getElementById('days-container');
  const days = data.days || [];

  if (days.length === 0 || days.every(d => !d.actualites?.length)) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="emoji">🔍</div>
        <p>Aucune actualité disponible.<br>Clique sur <strong>↻</strong> pour lancer la première mise à jour.</p>
      </div>`;
    return;
  }

  container.innerHTML = days
    .filter(d => d.actualites?.length)
    .map((day, di) => {
      const label = di === 0
        ? `<span class="today-label">Aujourd'hui — ${formatDateShort(day.date)}</span>`
        : formatDateShort(day.date);

      const cards = day.actualites.map(a => `
        <div class="actu-card">
          <div class="actu-header">
            <div class="actu-meta">
              <span class="source-badge">${esc(a.source)}</span>
              <span class="actu-date">${formatDate(a.date)}</span>
            </div>
            <span class="cat-badge ${catClass(a.categorie)}">${catLabel(a.categorie)}</span>
          </div>
          <div class="actu-titre">${esc(a.titre)}</div>
          <div class="actu-resume">${esc(a.resume)}</div>
        </div>`).join('');

      return `<div class="day-section">
        <div class="day-label">${label}</div>
        ${cards}
      </div>`;
    }).join('');
}

// --- REFRESH ---
async function refreshData() {
  const btn = document.querySelector('.refresh-btn');
  btn.disabled = true;
  btn.textContent = '⏳';
  try {
    const res = await fetch('/api/update', { method: 'POST' });
    const r = await res.json();
    if (r.ok) await loadActu();
    else alert('Erreur : ' + (r.error || 'inconnue'));
  } catch (e) {
    alert('Erreur réseau : ' + e.message);
  } finally {
    btn.disabled = false;
    btn.textContent = '↻';
  }
}

// --- PAYS ---
async function loadPays() {
  try {
    const res = await fetch('/data/countries.json');
    const pays = await res.json();
    renderPays(pays);
  } catch {
    document.getElementById('pays-container').innerHTML = '<p style="color:var(--text2);text-align:center;padding:24px">Erreur de chargement</p>';
  }
}

function renderPays(pays) {
  document.getElementById('pays-container').innerHTML = pays.map((p, i) => `
    <div class="pays-card">
      <div class="pays-header" onclick="togglePays(${i})">
        <div class="pays-left">
          <span class="pays-flag">${p.drapeau}</span>
          <div>
            <div class="pays-nom">${esc(p.nom)}</div>
            <div class="pays-role">${esc(p.role)}</div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          <span class="posture-badge posture-${p.posture}">${p.posture === 'hostile' ? '⚠️ Hostile' : '⚖️ Neutre'}</span>
          <span class="pays-chevron" id="pchevron-${i}">›</span>
        </div>
      </div>
      <div class="pays-body" id="pays-body-${i}">
        <div class="pays-actions">
          ${p.actions.map(a => `
            <div class="pays-action-item">
              <span class="pays-annee">${a.annee}</span>
              <span class="pays-texte">${esc(a.texte)}</span>
            </div>`).join('')}
        </div>
        <div class="pays-consequences">
          <strong>Conséquences</strong>
          ${esc(p.consequences)}
        </div>
      </div>
    </div>`).join('');
}

function togglePays(i) {
  const body = document.getElementById('pays-body-' + i);
  const chevron = document.getElementById('pchevron-' + i);
  const open = body.classList.toggle('open');
  chevron.style.transform = open ? 'rotate(90deg)' : '';
}

// --- HISTOIRE ---
async function loadHistory() {
  try {
    const res = await fetch('/api/history');
    renderTimeline(await res.json());
  } catch {
    document.getElementById('timeline-container').innerHTML = '<p style="color:var(--text2);text-align:center">Erreur</p>';
  }
}

function renderTimeline(items) {
  document.getElementById('timeline-container').innerHTML = items.map((item, i) => `
    <div class="timeline-item">
      <div class="timeline-dot" style="background:${item.couleur};box-shadow:0 0 0 2px ${item.couleur}44"></div>
      <div class="timeline-card">
        <div class="timeline-header" onclick="toggleItem(${i})">
          <div>
            <div class="timeline-periode">${esc(item.periode)}</div>
            <div class="timeline-titre">${esc(item.titre)}</div>
          </div>
          <span class="timeline-chevron" id="chevron-${i}">›</span>
        </div>
        <div class="timeline-body" id="body-${i}">
          <p class="timeline-resume">${esc(item.resume)}</p>
          <div class="timeline-events">
            ${item.evenements.map(e => `
              <div class="event-item">
                <span class="event-annee">${e.annee}</span>
                <span class="event-texte">${esc(e.texte)}</span>
              </div>`).join('')}
          </div>
        </div>
      </div>
    </div>`).join('');
}

function toggleItem(i) {
  const body = document.getElementById('body-' + i);
  const chevron = document.getElementById('chevron-' + i);
  const open = body.classList.toggle('open');
  chevron.style.transform = open ? 'rotate(90deg)' : '';
}

// --- UTILITAIRES ---
function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// --- INIT ---
loadActu();
loadPays();
loadHistory();

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}
