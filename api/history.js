'use strict';
const { kvGet } = require('../lib/storage');
const seed = require('../public/data/history.json');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  try {
    const data = await kvGet('ormuz_history');
    res.json(data || seed);
  } catch (e) {
    console.error('[history] Erreur:', e.message);
    res.status(500).json({ error: e.message });
  }
};
