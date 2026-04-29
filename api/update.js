'use strict';
const { fetchArticles } = require('../lib/rss');
const { summarizeAll, checkHistoryWorthy, weekSummary } = require('../lib/groq');
const { fetchOilPrice } = require('../lib/oil');
const { kvGet, kvSet } = require('../lib/storage');
const seed = require('../public/data/history.json');

async function runUpdate() {
  console.log('[Update] Démarrage...');

  // 1. RSS
  const articles = await fetchArticles();
  console.log(`[Update] ${articles.length} article(s)`);

  // 2. Résumés
  let actualites = [];
  if (articles.length > 0) {
    actualites = await summarizeAll(articles);
    console.log(`[Update] ${actualites.length} résumé(s)`);
  }

  // 3. Prix pétrole
  const petrole = await fetchOilPrice();

  // 4. Charger données existantes
  let stored = await kvGet('ormuz_latest') || { lastUpdate: null, days: [] };
  if (!Array.isArray(stored.days)) stored.days = [];

  const today = new Date().toISOString().slice(0, 10);
  stored.days = stored.days.filter(d => d.date !== today);
  stored.days.unshift({ date: today, actualites, petrole });

  // 5. Si 8 jours → merger dans la frise
  if (stored.days.length >= 8) {
    const toMerge = stored.days.splice(7);
    const allArticles = toMerge.flatMap(d => d.actualites || []);
    if (allArticles.length > 0) {
      try {
        const summary = await weekSummary(allArticles);
        const history = await kvGet('ormuz_history') || seed;
        const last = history[history.length - 1];
        if (last && summary) {
          const weekLabel = toMerge[0]?.date || '';
          last.resume += `\n\n[${weekLabel}] ${summary}`;
          await kvSet('ormuz_history', history);
          console.log('[Update] Frise semaine mise à jour');
        }
      } catch (e) {
        console.warn('[Update] Erreur merge frise:', e.message);
      }
    }
  }

  // 6. Mise à jour frise si événements significatifs
  if (actualites.length > 0) {
    try {
      const events = await checkHistoryWorthy(actualites);
      if (events.length > 0) {
        const history = await kvGet('ormuz_history') || seed;
        const last = history[history.length - 1];
        let added = 0;
        for (const ev of events) {
          const exists = last.evenements.some(e => e.texte.slice(0, 30) === (ev.texte || '').slice(0, 30));
          if (!exists && ev.texte) {
            last.evenements.push({ annee: ev.annee || new Date().getFullYear(), texte: ev.texte });
            added++;
          }
        }
        if (added > 0) {
          await kvSet('ormuz_history', history);
          console.log(`[Update] ${added} événement(s) ajouté(s) à la frise`);
        }
      }
    } catch (e) {
      console.warn('[Update] Erreur frise:', e.message);
    }
  }

  stored.lastUpdate = new Date().toISOString();
  await kvSet('ormuz_latest', stored);
  console.log('[Update] ✅ Terminé');
  return stored;
}

module.exports = async (req, res) => {
  // Accepte GET (cron Vercel) et POST (bouton manuel)
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const data = await runUpdate();
    res.json({ ok: true, data });
  } catch (e) {
    console.error('[Update] ERREUR:', e.message);
    res.status(500).json({ ok: false, error: e.message });
  }
};
