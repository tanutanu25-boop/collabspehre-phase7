const m = require('mongoose'), S = m.Schema, id = (ref) => ({ type: S.Types.ObjectId, ref });
exports.User = m.model('User', new S({ name: String, email: { type: String, unique: true, lowercase: true }, password: String }));
exports.Project = m.model('Project', new S({ title: String, description: String, owner: id('User'), members: [id('User')], isPublic: { type: Boolean, default: false }, shareId: String }, { timestamps: true }));
exports.Note = m.model('Note', new S({ project: id('Project'), author: id('User'), title: String, content: String }, { timestamps: true }));
exports.File = m.model('File', new S({ project: id('Project'), uploader: id('User'), name: String, path: String, url: String, mime: String }, { timestamps: true }));
