const r = require('express').Router(), multer = require('multer'), crypto = require('crypto'), fs = require('fs'), path = require('path');
const auth = require('../middleware/auth'), { User, Project, Note, File } = require('../models');
const up = multer({
  storage: multer.diskStorage({
    destination: path.join(__dirname, '../uploads'),
    filename: (q, f, cb) => cb(null, Date.now() + '-' + crypto.randomBytes(4).toString('hex') + path.extname(f.originalname))
  }), limits: { fileSize: 2 * 1024 * 1024 }
});
// loads the project only if the logged-in user is a member
const ok = fn => async (q, s) => {
  try { const p = await Project.findOne({ _id: q.params.id, members: q.uid }); if (!p) return s.status(404).json({ error: 'Project not found' }); await fn(q, s, p); }
  catch (e) { s.status(500).json({ error: e.message }); }
};
r.use(auth);
r.get('/', async (q, s) => s.json(await Project.find({ members: q.uid }).sort('-createdAt')));
r.post('/', async (q, s) => {
  if (!q.body.title) return s.status(400).json({ error: 'Title required' });
  s.json(await Project.create({ title: q.body.title, description: q.body.description, owner: q.uid, members: [q.uid] }));
});
r.get('/:id', ok(async (q, s, p) => { await p.populate('members', 'name email'); s.json(p); }));
r.post('/:id/members', ok(async (q, s, p) => {
  if (String(p.owner) !== q.uid) return s.status(403).json({ error: 'Only the owner can invite' });
  const u = await User.findOne({ email: (q.body.email || '').toLowerCase() });
  if (!u) return s.status(404).json({ error: 'No user with that email' });
  p.members.addToSet(u._id); await p.save(); s.json({ ok: true });
}));
r.get('/:id/notes', ok(async (q, s, p) => s.json(await Note.find({ project: p._id }).sort('-updatedAt'))));
r.post('/:id/notes', ok(async (q, s, p) => s.json(await Note.create({ project: p._id, author: q.uid, title: q.body.title || 'Untitled', content: q.body.content }))));
r.put('/:id/notes/:nid', ok(async (q, s, p) => s.json(await Note.findOneAndUpdate({ _id: q.params.nid, project: p._id }, { title: q.body.title, content: q.body.content }, { new: true }))));
r.get('/:id/files', ok(async (q, s, p) => s.json(await File.find({ project: p._id }).sort('-createdAt'))));
r.post('/:id/files', up.single('file'), ok(async (q, s, p) => {
  if (!q.file) return s.status(400).json({ error: 'No file' });
  s.json(await File.create({ project: p._id, uploader: q.uid, name: q.file.originalname, path: q.file.path, url: '/uploads/' + q.file.filename, mime: q.file.mimetype }));
}));
r.get('/:id/files/:fid/text', ok(async (q, s, p) => {
  const f = await File.findOne({ _id: q.params.fid, project: p._id });
  if (!f) return s.status(404).json({ error: 'File not found' });
  s.json({ text: fs.readFileSync(f.path, 'utf8').slice(0, 20000) });
}));
r.get('/:id/stats', ok(async (q, s, p) => {
  const [n, f, users] = await Promise.all([Note.find({ project: p._id }), File.find({ project: p._id }), User.find({ _id: { $in: p.members } })]);
  const st = {}; users.forEach(u => st[u._id] = { name: u.name, notes: 0, files: 0 });
  n.forEach(x => st[x.author] && st[x.author].notes++); f.forEach(x => st[x.uploader] && st[x.uploader].files++);
  s.json(Object.values(st));
}));
r.put('/:id/share', ok(async (q, s, p) => {
  p.isPublic = !p.isPublic; p.shareId = p.shareId || crypto.randomBytes(6).toString('hex'); await p.save(); s.json(p);
}));
module.exports = r;
