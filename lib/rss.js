'use strict';
const RssParser = require('rss-parser');
const rss = new RssParser({ timeout: 10000 });

const SOURCES = [
  { url: 'https://www.aljazeera.com/xml/rss/all.xml',                          nom: 'Al Jazeera',    filtre: /ormuz|iran|hormuz|gulf|strait|tanker|sanction|nuclear|persian/i },
  { url: 'https://feeds.bbci.co.uk/news/world/middle_east/rss.xml',            nom: 'BBC',           filtre: /ormuz|iran|hormuz|gulf|tanker|strait|nuclear/i },
  { url: 'https://www.lemonde.fr/rss/une.xml',                                  nom: 'Le Monde',      filtre: /ormuz|iran|hormuz|golfe|tanker|détroit|nucléaire/i },
  { url: 'https://rss.nytimes.com/services/xml/rss/nyt/MiddleEast.xml',        nom: 'NY Times',      filtre: /ormuz|iran|hormuz|gulf|tanker|strait|oil|nuclear/i },
  { url: 'https://www.theguardian.com/world/middleeast/rss',                    nom: 'The Guardian',  filtre: /ormuz|iran|hormuz|gulf|tanker|strait|oil|nuclear/i },
  { url: 'https://foreignpolicy.com/feed/',                                     nom: 'Foreign Policy', filtre: /ormuz|iran|hormuz|gulf|tanker|strait|oil|persian|nuclear/i },
];

function normalizeDate(raw) {
  if (!raw) return new Date().toISOString();
  try {
    const d = new Date(raw);
    if (!isNaN(d.getTime())) return d.toISOString();
  } catch {}
  return new Date().toISOString();
}

async function fetchArticles() {
  const articles = [];
  for (const src of SOURCES) {
    try {
      const feed = await rss.parseURL(src.url);
      const matches = (feed.items || [])
        .filter(i => src.filtre.test((i.title || '') + ' ' + (i.contentSnippet || '')))
        .slice(0, 1);
      for (const item of matches) {
        articles.push({
          source: src.nom,
          titre_original: (item.title || '').trim(),
          contenu: (item.contentSnippet || item.content || '').replace(/<[^>]+>/g, '').trim().slice(0, 400),
          url: item.link || '',
          date: normalizeDate(item.isoDate || item.pubDate),
        });
      }
    } catch (e) {
      console.warn(`[RSS] ${src.nom}: ${e.message}`);
    }
  }
  return articles;
}

module.exports = { fetchArticles, normalizeDate };
