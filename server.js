'use strict';
const express = require('express');
const path = require('path');
const fs = require('fs');
const cron = require('node-cron');
const { execFile } = require('child_process');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_PATH = path.join(__dirname, 'data/latest.json');
const HISTORY_PATH = path.join(__dirname, 'public/data/history.json');

app.use(express.json());

// API routes d'abord
// Données live
app.get('/api/latest', (req, res) => {
  try { res.json(JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'))); }
  catch { res.json({ lastUpdate: null, days: [] }); }
});

// Frise historique (local : fichier statique)
app.get('/api/history', (req, res) => {
  try { res.json(JSON.parse(fs.readFileSync(HISTORY_PATH, 'utf8'))); }
  catch { res.status(500).json({ error: 'history.json introuvable' }); }
});

// Statique après les routes API
app.use(express.static(path.join(__dirname, 'public')));

// Mise à jour manuelle
app.post('/api/update', (req, res) => {
  const scriptPath = path.join(__dirname, 'scripts/update.js');
  execFile('node', [scriptPath], { timeout: 90000 }, (err, stdout, stderr) => {
    if (err) return res.json({ ok: false, error: stderr || err.message });
    console.log(stdout);
    try { res.json({ ok: true, data: JSON.parse(fs.readFileSync(DATA_PATH, 'utf8')) }); }
    catch { res.json({ ok: true }); }
  });
});

// Cron local : 6h chaque matin
cron.schedule('0 6 * * *', () => {
  execFile('node', [path.join(__dirname, 'scripts/update.js')], { timeout: 90000 },
    (err, stdout) => err ? console.error('[Cron]', err.message) : console.log(stdout)
  );
}, { timezone: 'Europe/Paris' });

app.listen(PORT, () => {
  console.log(`\n⚓ Le Détroit — démarré`);
  console.log(`   → http://localhost:${PORT}\n`);
});
