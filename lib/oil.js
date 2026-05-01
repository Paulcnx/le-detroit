'use strict';
const fetch = globalThis.fetch || require('node-fetch');

async function fetchOilPrice() {
  try {
    const res = await fetch(
      'https://api.stlouisfed.org/fred/series/observations?series_id=DCOILWTICO&api_key=freemium&file_type=json&limit=3&sort_order=desc'
    );
    if (!res.ok) return {};
    const data = await res.json();
    const obs = (data.observations || []).filter(o => o.value !== '.');
    const prix = obs[0] ? parseFloat(obs[0].value) : null;
    const prixPrev = obs[1] ? parseFloat(obs[1].value) : null;
    const variation = prix && prixPrev ? ((prix - prixPrev) / prixPrev) * 100 : null;
    return { prix_wti: prix, variation_wti: variation };
  } catch {
    return {};
  }
}

module.exports = { fetchOilPrice };
