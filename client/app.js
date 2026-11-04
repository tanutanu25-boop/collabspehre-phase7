const $ = s => document.querySelector(s), A = $('#app');
let T = localStorage.token, P, NOTES = [], CUR = null;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => '&#' + c.charCodeAt(0) + ';');
const md = t => DOMPurify.sanitize(marked.parse(t || ''));
const toast = m => { const t = $('#toast'); t.textContent = m; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 2800); };
async function api(u, o = {}) {
  const fd = o.body instanceof FormData, h = { Authorization: 'Bearer ' + T };
  if (!fd) h['Content-Type'] = 'application/json';
  const r = await fetch('/api' + u, { ...o, headers: h, body: o.body && !fd ? JSON.stringify(o.body) : o.body });
  const d = await r.json(); if (!r.ok) throw new Error(d.error || 'Error'); return d;
}
const go = async fn => { try { await fn(); } catch (e) { toast('⚠️ ' + e.message); } };
$('#out').onclick = () => { localStorage.removeItem('token'); T = null; $('#out').classList.add('hide'); authView(); };

function authView(reg) {
  A.innerHTML = `<form class="card auth fade" id="f"><h2>${reg ? 'Create account' : 'Welcome back'}</h2>
  ${reg ? '<input name="name" placeholder="Name" required>' : ''}<input name="email" type="email" placeholder="Email" required>
  <input name="password" type="password" placeholder="Password (min 6)" minlength="6" required>
  <button class="btn" style="width:100%">${reg ? 'Register' : 'Login'}</button>
  <p class="link" id="sw">${reg ? 'Have an account? Login' : 'New here? Register'}</p></form>`;
  $('#sw').onclick = () => authView(!reg);
  $('#f').onsubmit = e => { e.preventDefault(); go(async () => {
    const d = await api('/auth/' + (reg ? 'register' : 'login'), { method: 'POST', body: Object.fromEntries(new FormData(e.target)) });
    T = localStorage.token = d.token; dash();
  }); };
}

async function dash() {
  $('#out').classList.remove('hide');
  const ps = await api('/projects');
  A.innerHTML = `<div class="card fade"><h2>New project</h2><form id="np" class="row"><input name="title" placeholder="Project title" required>
  <input name="description" placeholder="Short description"><button class="btn">Create</button></form></div>
  <div class="grid">${ps.map(p => `<div class="card hover fade" data-id="${p._id}"><h3>${esc(p.title)}</h3><p>${esc(p.description)}</p>
  <small>👥 ${p.members.length} ${p.isPublic ? '· 🌍 public' : ''}</small></div>`).join('') || '<p>No projects yet — create one!</p>'}</div>`;
  $('#np').onsubmit = e => { e.preventDefault(); go(async () => { await api('/projects', { method: 'POST', body: Object.fromEntries(new FormData(e.target)) }); dash(); }); };
  document.querySelectorAll('[data-id]').forEach(c => c.onclick = () => go(() => proj(c.dataset.id)));
}

async function proj(id) {
  P = await api('/projects/' + id); CUR = null;
  const [notes, files, st] = await Promise.all([api(`/projects/${id}/notes`), api(`/projects/${id}/files`), api(`/projects/${id}/stats`)]);
  NOTES = notes;
  const isCode = n => /\.(js|py|java|c|cpp|ts|html|css|json|php|go|rb)$/i.test(n);
  const link = P.isPublic ? `${location.origin}/#share-${P.shareId}` : '';
  A.innerHTML = `<button class="btn ghost" id="bk">← Back</button><h2>${esc(P.title)}</h2><p>${esc(P.description)}</p>
  <div class="two"><section class="card fade"><h3>📝 Notes (Markdown)</h3>
   <div class="chips">${notes.map(n => `<span class="chip" data-n="${n._id}">${esc(n.title)}</span>`).join('')}<span class="chip" id="nn">+ New</span></div>
   <input id="nt" placeholder="Note title"><div class="two"><textarea id="ne" placeholder="# Write markdown..."></textarea><div id="pv" class="preview"></div></div>
   <div class="row"><button class="btn" id="sv">💾 Save</button>
   ${['explain', 'improve', 'docs', 'readme'].map(k => `<button class="btn ai" data-ai="${k}">✨ ${k}</button>`).join('')}</div>
   <div id="ai" class="ai-out hide"></div></section>
  <aside>
   <div class="card fade"><h3>📎 Files</h3><input type="file" id="fu">
    ${files.map(f => `<div class="file"><div><a href="${f.url}" target="_blank">${esc(f.name)}</a>
    ${f.mime.startsWith('image/') ? `<br><img src="${f.url}">` : ''}</div>${isCode(f.name) ? `<button class="btn ai" data-ex="${f._id}">Explain</button>` : ''}</div>`).join('')}</div>
   <div class="card fade"><h3>👥 Team</h3>${P.members.map(m => `<div>${esc(m.name)} <small>${esc(m.email)}</small></div>`).join('')}
    <form id="inv" class="row"><input name="email" type="email" placeholder="Invite by email" required><button class="btn">Add</button></form></div>
   <div class="card fade"><h3>📊 Contributions</h3><table><tr><th>Member</th><th>Notes</th><th>Files</th></tr>
    ${st.map(x => `<tr><td>${esc(x.name)}</td><td>${x.notes}</td><td>${x.files}</td></tr>`).join('')}</table></div>
   <div class="card fade"><h3>🌍 Public page</h3><button class="btn" id="sh">${P.isPublic ? 'Make private' : 'Make public'}</button>
    ${link ? `<p><a href="${link}" target="_blank">${link}</a></p>` : ''}</div>
  </aside></div>`;
  const show = h => { const b = $('#ai'); b.classList.remove('hide'); b.innerHTML = h; };
  const ai = async (kind, text, btn) => {
    if (!text.trim()) return toast('Write or select something first');
    btn?.classList.add('busy'); show('⏳ Gemini is thinking…');
    try { show(md((await api('/gemini/' + kind, { method: 'POST', body: { text } })).result)); }
    catch (e) { show('⚠️ ' + esc(e.message)); } btn?.classList.remove('busy');
  };
  $('#bk').onclick = () => go(dash);
  $('#ne').oninput = () => $('#pv').innerHTML = md($('#ne').value);
  document.querySelectorAll('[data-n]').forEach(c => c.onclick = () => {
    CUR = NOTES.find(n => n._id === c.dataset.n); $('#nt').value = CUR.title; $('#ne').value = CUR.content || ''; $('#ne').oninput();
    document.querySelectorAll('.chip').forEach(x => x.classList.toggle('on', x === c));
  });
  $('#nn').onclick = () => { CUR = null; $('#nt').value = ''; $('#ne').value = ''; $('#ne').oninput(); };
  $('#sv').onclick = () => go(async () => {
    const body = { title: $('#nt').value, content: $('#ne').value };
    await api(`/projects/${id}/notes${CUR ? '/' + CUR._id : ''}`, { method: CUR ? 'PUT' : 'POST', body }); toast('✅ Saved'); proj(id);
  });
  document.querySelectorAll('[data-ai]').forEach(b => b.onclick = () => ai(b.dataset.ai,
    b.dataset.ai === 'readme' ? `Project: ${P.title}\n${P.description}\n\n${$('#ne').value}` : $('#ne').value, b));
  document.querySelectorAll('[data-ex]').forEach(b => b.onclick = () => go(async () => {
    const { text } = await api(`/projects/${id}/files/${b.dataset.ex}/text`); ai('explain', text, b);
  }));
  $('#fu').onchange = e => go(async () => { const fd = new FormData(); fd.append('file', e.target.files[0]); await api(`/projects/${id}/files`, { method: 'POST', body: fd }); toast('📎 Uploaded'); proj(id); });
  $('#inv').onsubmit = e => { e.preventDefault(); go(async () => { await api(`/projects/${id}/members`, { method: 'POST', body: Object.fromEntries(new FormData(e.target)) }); toast('Member added'); proj(id); }); };
  $('#sh').onclick = () => go(async () => { await api(`/projects/${id}/share`, { method: 'PUT' }); proj(id); });
}

async function pub(sid) {
  $('#out').classList.add('hide');
  const r = await fetch('/api/public/' + sid), d = await r.json();
  if (!r.ok) return A.innerHTML = '<h2>Project not found or not public</h2>';
  A.innerHTML = `<div class="card fade"><h2>${esc(d.project.title)}</h2><p>${esc(d.project.description)} — by ${esc(d.project.owner.name)}</p></div>` +
    d.notes.map(n => `<div class="card fade"><h3>${esc(n.title)}</h3><div class="preview">${md(n.content)}</div></div>`).join('');
}
if (location.hash.startsWith('#share-')) pub(location.hash.slice(7));
else if (T) dash().catch(() => authView()); else authView();
