const r = require('express').Router(), bcrypt = require('bcryptjs'), jwt = require('jsonwebtoken'), { User } = require('../models');
const token = u => jwt.sign({ id: u._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
r.post('/register', async (q, s) => {
  try {
    const { name, email, password } = q.body;
    if (!name || !email || !password) return s.status(400).json({ error: 'All fields required' });
    if (await User.findOne({ email: email.toLowerCase() })) return s.status(400).json({ error: 'Email already registered' });
    const u = await User.create({ name, email, password: await bcrypt.hash(password, 10) });
    s.json({ token: token(u) });
  } catch (e) { s.status(500).json({ error: e.message }); }
});
r.post('/login', async (q, s) => {
  try {
    const u = await User.findOne({ email: (q.body.email || '').toLowerCase() });
    if (!u || !(await bcrypt.compare(q.body.password || '', u.password))) return s.status(400).json({ error: 'Invalid credentials' });
    s.json({ token: token(u) });
  } catch (e) { s.status(500).json({ error: e.message }); }
});
module.exports = r;
