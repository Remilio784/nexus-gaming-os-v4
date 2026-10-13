import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import fetch from 'node-fetch';

dotenv.config({ path: './.env' });

const app = express();
const port = Number(process.env.PORT || 4000);

const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173').split(',');

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  }),
);
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, status: 'NEXUS backend ready' });
});

app.post('/api/ai/chat', async (req, res) => {
  const { message } = req.body ?? {};

  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'Le message est vide.' });
  }

  const apiKey = process.env.OPENAI_API_KEY || process.env.AI_API_KEY;

  if (!apiKey) {
    return res.status(503).json({
      error: 'Aucune clé API configurée. Configurez OPENAI_API_KEY ou AI_API_KEY dans backend/.env.',
    });
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.AI_MODEL || 'gpt-4o-mini',
        messages: [{ role: 'user', content: message }],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({
        error: 'Erreur fournisseur IA',
        message: errorText || 'Le fournisseur d\'IA a refusé la requête.',
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    return res.json({ message: content ?? null });
  } catch (error) {
    return res.status(500).json({ error: 'Erreur interne du backend', message: error instanceof Error ? error.message : 'Erreur inconnue.' });
  }
});

app.listen(port, () => {
  console.log(`NEXUS backend listening on http://localhost:${port}`);
});
