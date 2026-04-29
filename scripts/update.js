'use strict';
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { fetchArticles } = require('../lib/rss');
const { summarizeAll, checkHistoryWorthy, weekSummary } = require('../lib/groq');
const { fetchOilPrice } = require('../lib/oil');

const DATA_PATH    = path.join(__dirname, '../data/latest.json');
const HISTORY_PATH = path.join(__dirname, '../public/data/history.json');

async function run() {
  console.log('[Update] Démarrage...');

  const articles = await fetchArticles();
  console.log(`[Update] ${articles.length} article(s)`);

  let actualites = [];
  if (articles.length > 0) {
    actualites = await summarizeAll(articles);
    console.log(`[Update] ${actualites.length} résumé(s)`);
  }

  const petrole = await fetchOilPrice();

  // Charger données existantes
  let stored = { lastUpdate: null, days: [] };
  try { stored = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8')); } catch {}
  if (!Array.isArray(stored.days)) stored.days = [];

  const today = new Date().toISOString().slice(0, 10);
  stored.days = stored.days.filter(d => d.date !== today);
  stored.days.unshift({ date: today, actualites, petrole });

  // Merge semaine si 8 jours
  if (stored.days.length >= 8) {
    const toMerge = stored.days.splice(7);
    const allArticles = toMerge.flatMap(d => d.actualites || []);
    if (allArticles.length > 0) {
      try {
        const summary = await weekSummary(allArticles);
        const history = JSON.parse(fs.readFileSync(HISTORY_PATH, 'utf8'));
        const last = history[history.length - 1];
        if (last && summary) {
          last.resume += `\n\n[${toMerge[0]?.date || ''}] ${summary}`;
          fs.writeFileSync(HISTORY_PATH, JSON.stringify(history, null, 2), 'utf8');
          console.log('[Update] Frise semaine mise à jour');
        }
      } catch (e) { console.warn('[Update] Merge frise:', e.message); }
    }
  }

  // Ajouter événements significatifs à la frise
  if (actualites.length > 0) {
    try {
      const events = await checkHistoryWorthy(actualites);
      if (events.length > 0) {
        const history = JSON.parse(fs.readFileSync(HISTORY_PATH, 'utf8'));
        const last = history[history.length - 1];
        let added = 0;
        for (const ev of events) {
          const exists = last.evenements.some(e => e.texte.slice(0,30) === (ev.texte||'').slice(0,30));
          if (!exists && ev.texte) {
            last.evenements.push({ annee: ev.annee || new Date().getFullYear(), texte: ev.texte });
            added++;
          }
        }
        if (added > 0) {
          fs.writeFileSync(HISTORY_PATH, JSON.stringify(history, null, 2), 'utf8');
          console.log(`[Update] ${added} événement(s) ajouté(s) à la frise`);
        }
      }
    } catch (e) { console.warn('[Update] Frise:', e.message); }
  }

  stored.lastUpdate = new Date().toISOString();
  fs.writeFileSync(DATA_PATH, JSON.stringify(stored, null, 2), 'utf8');
  console.log('[Update] ✅ Terminé');
}

run().catch(e => { console.error('[Update] ERREUR:', e.message); process.exit(1); });
