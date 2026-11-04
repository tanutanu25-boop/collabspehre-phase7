const r = require('express').Router(), auth = require('../middleware/auth');
const prompts = {
  explain: 'Explain the following code or notes clearly for a developer:',
  improve: 'Suggest concrete improvements for this markdown note:',
  docs: 'Generate clear markdown documentation for this code:',
  readme: 'Write a professional README.md (markdown) for this project:'
};
async function ask(prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) });
  const d = await res.json();
  if (!res.ok) throw new Error(d.error?.message || 'Gemini error');
  return d.candidates?.[0]?.content?.parts?.[0]?.text || 'No response';
}
r.post('/:kind', auth, async (q, s) => {
  const p = prompts[q.params.kind];
  if (!p || !q.body.text?.trim()) return s.status(400).json({ error: 'Text is required' });
  try { s.json({ result: await ask(p + '\n\n' + q.body.text.slice(0, 15000)) }); }
  catch (e) { s.status(500).json({ error: e.message }); }
});
module.exports = r;
