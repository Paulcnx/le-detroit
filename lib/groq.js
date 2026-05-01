'use strict';
const fetch = globalThis.fetch || require('node-fetch');

const GROQ_KEY = () => process.env.GROQ_API_KEY;

async function groqCall(prompt, maxTokens = 600) {
  await new Promise(r => setTimeout(r, 2000));
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_KEY()}` },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.4,
      max_tokens: maxTokens
    })
  });
  if (!res.ok) throw new Error(`Groq ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const json = await res.json();
  return (json.choices?.[0]?.message?.content || '').trim();
}

async function summarizeArticle(article) {
  const prompt = `Tu es un expert en géopolitique du Moyen-Orient qui rédige une veille stratégique en français.

Rédige un résumé journalistique complet en français de cet article. Le résumé doit :
- Faire 5 à 7 phrases bien construites
- Expliquer CE QUI s'est passé (faits précis, chiffres, citations si disponibles)
- Donner le CONTEXTE (situation de fond, enjeux, historique immédiat)
- Analyser les CONSÉQUENCES probables (géopolitiques, économiques, militaires)
- Mentionner les acteurs et leurs positions
- Ne jamais renvoyer vers l'article original

Réponds avec un objet JSON sur une seule ligne : {"titre": "...", "resume": "...", "categorie": "militaire|economique|diplomatique|maritime"}

Article :
Source: ${article.source}
Titre: ${article.titre_original}
Contenu: ${article.contenu}`;

  const text = await groqCall(prompt, 600);
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Non parseable: ' + text.slice(0, 150));
  const parsed = JSON.parse(match[0]);
  return {
    titre: parsed.titre || article.titre_original,
    resume: parsed.resume || '',
    categorie: parsed.categorie || 'maritime',
    source: article.source,
    date: article.date,
    url: article.url,
  };
}

async function summarizeAll(articles) {
  const results = [];
  for (const a of articles) {
    try {
      results.push(await summarizeArticle(a));
    } catch (e) {
      console.warn(`[Groq] ${a.source}: ${e.message}`);
    }
  }
  return results;
}

async function checkHistoryWorthy(actualites) {
  const SIGNIFICANT = /saisie|frappe|assassinat|accord|nucléaire|blocus|fermeture du détroit|sanctions|missile|drone|négociation|traité|crise|escalade|rupture|normalisation/i;
  const hits = actualites.filter(a => SIGNIFICANT.test(a.titre + ' ' + a.resume));
  if (!hits.length) return [];

  const prompt = `Tu es un historien expert du Moyen-Orient.
Pour CHAQUE actualité ci-dessous digne d'une frise historique, écris une ligne factuelle courte (max 15 mots).
Réponds UNIQUEMENT avec un tableau JSON : [{"annee": 2026, "texte": "..."}]
Si aucune n'est significative : []

Actualités :
${hits.map(a => `- ${a.date?.slice(0,10)} : ${a.titre}`).join('\n')}`;

  const text = await groqCall(prompt, 300);
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) return [];
  return JSON.parse(match[0]);
}

async function weekSummary(articles) {
  const prompt = `Tu es un historien expert du Moyen-Orient.
Rédige un paragraphe de synthèse de 3-4 phrases sur la semaine passée au détroit d'Ormuz.
Sois factuel, précis, mentionne dates et acteurs. Ne commence pas par "Cette semaine".
Réponds uniquement avec le texte.

Actualités :
${articles.map(a => `- ${a.date?.slice(0,10)} : ${a.titre}`).join('\n')}`;

  return groqCall(prompt, 300);
}

module.exports = { summarizeAll, checkHistoryWorthy, weekSummary };
