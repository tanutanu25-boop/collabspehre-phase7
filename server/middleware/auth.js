const jwt = require('jsonwebtoken');
module.exports = (q, s, next) => {
  try { q.uid = jwt.verify((q.headers.authorization || '').split(' ')[1], process.env.JWT_SECRET).id; next(); }
  catch { s.status(401).json({ error: 'Please log in' }); }
};
