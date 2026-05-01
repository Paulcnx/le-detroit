'use strict';
// Upstash Redis REST — stockage clé/valeur pour la production Vercel
const fetch = globalThis.fetch || require('node-fetch');

// Lecture paresseuse : les variables sont lues au moment de l'appel,
// pas au chargement du module, pour garantir qu'elles sont disponibles
// dans l'environnement serverless Vercel.
function getEnv() {
  const url   = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  return { url, token };
}

async function kvGet(key) {
  const { url, token } = getEnv();
  if (!url || !token) return null;
  const res = await fetch(`${url}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) return null;
  const { result } = await res.json();
  return result ? JSON.parse(result) : null;
}

async function kvSet(key, value) {
  const { url, token } = getEnv();
  if (!url || !token) throw new Error('Upstash non configuré (UPSTASH_REDIS_REST_URL ou TOKEN manquant)');
  const res = await fetch(`${url}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify([['SET', key, JSON.stringify(value)]])
  });
  if (!res.ok) throw new Error(`Upstash SET ${res.status}`);
}

module.exports = { kvGet, kvSet };
