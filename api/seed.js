'use strict';
// Appeler UNE SEULE FOIS après le premier déploiement
// pour initialiser la frise dans Upstash
const { kvSet, kvGet } = require('../lib/storage');
const seed = require('../public/data/history.json');

module.exports = async (req, res) => {
  const existing = await kvGet('ormuz_history');
  if (existing) {
    return res.json({ ok: true, message: 'Déjà initialisé', entries: existing.length });
  }
  await kvSet('ormuz_history', seed);
  res.json({ ok: true, message: 'Frise initialisée dans Upstash', entries: seed.length });
};
