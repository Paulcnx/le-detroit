'use strict';
const { kvGet } = require('../lib/storage');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  try {
    const data = await kvGet('ormuz_latest');
    res.json(data || { days: [], lastUpdate: null });
  } catch (e) {
    console.error('[latest] Erreur:', e.message);
    res.status(500).json({ error: e.message, days: [], lastUpdate: null });
  }
};
