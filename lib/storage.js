'use strict';
// Upstash Redis REST — stockage clé/valeur pour la production Vercel
const fetch = require('node-fetch');

const URL   = process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

async function kvGet(key) {
  if (!URL || !TOKEN) return null;
  const res = await fetch(`${URL}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${TOKEN}` }
  });
  if (!res.ok) return null;
  const { result } = await res.json();
  return result ? JSON.parse(result) : null;
}

async function kvSet(key, value) {
  if (!URL || !TOKEN) throw new Error('Upstash non configuré');
  const res = await fetch(`${URL}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify([['SET', key, JSON.stringify(value)]])
  });
  if (!res.ok) throw new Error(`Upstash SET ${res.status}`);
}

module.exports = { kvGet, kvSet };
