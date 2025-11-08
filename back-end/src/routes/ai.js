const express = require('express');
const router = express.Router();

// Prefer the global fetch (Node 18+). If not available, try to require node-fetch.
let fetchFn = globalThis.fetch;
if (!fetchFn) {
  try {
    // require lazily so module can load even if node-fetch is not installed
    // and users running Node >=18 will use the native fetch automatically.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    fetchFn = require('node-fetch');
  } catch (err) {
    // leave fetchFn undefined and handle later (we'll fall back to local reply)
    fetchFn = undefined;
  }
}

// POST /api/ai/chat
// body: { message: string }
// Uses Hugging Face Inference API if HF_API_TOKEN is present, otherwise falls back to a local demo responder.
router.post('/chat', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || typeof message !== 'string') return res.status(400).json({ error: 'message is required' });

    const hfToken = process.env.HF_API_TOKEN;
    if (hfToken && fetchFn) {
      // Send to Hugging Face Inference API using a general-purpose model (gpt2 used as default).
      // You can change the model to any available model in your HF account (e.g., 'google/flan-t5-large').
      const model = process.env.HF_MODEL || 'gpt2';
      const url = `https://api-inference.huggingface.co/models/${model}`;
      const payload = { inputs: message, parameters: { max_new_tokens: 256 } };

      const r = await fetchFn(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${hfToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!r.ok) {
        const txt = await r.text();
        return res.status(502).json({ error: 'AI provider error', details: txt });
      }

      const data = await r.json();
      // Hugging Face may return an array of {generated_text} or a text/string depending on the model
      let reply = '';
      if (Array.isArray(data) && data.length && data[0].generated_text) reply = data[0].generated_text;
      else if (typeof data === 'string') reply = data;
      else if (data && typeof data === 'object') reply = JSON.stringify(data);
      else reply = 'Sorry, no reply from AI provider.';

      return res.json({ reply });
    }

    // Fallback local responder (no external API key required)
    // A very small demo: echo back and provide a friendly suggestion.
    const reply = `I heard: "${message}". Try asking me to explain a concept, give an example, or show code snippets.`;
    return res.json({ reply });
  } catch (err) {
    console.error('AI chat error', err);
    return res.status(500).json({ error: 'internal_error' });
  }
});

module.exports = router;
