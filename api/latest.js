'use strict';
const { kvGet } = require('../lib/storage');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const data = await kvGet('ormuz_latest');
  res.json(data || { days: [], lastUpdate: null });
};
