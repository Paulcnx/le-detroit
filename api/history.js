'use strict';
const { kvGet } = require('../lib/storage');
const seed = require('../public/data/history.json');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const data = await kvGet('ormuz_history');
  res.json(data || seed);
};
