/**
 * DBIMSCA Sports – Backend Server
 * Simple Express + JSON-file "database" (no extra DB needed)
 * Run:  node server.js   (or  npm start)
 * API:  http://localhost:3000
 */

const express = require('express');
const cors    = require('cors');
const fs      = require('fs');
const path    = require('path');

const app  = express();
const PORT = 3000;
const DB   = path.join(__dirname, '../data/registrations.json');

/* ── helpers ── */
function readDB() {
  if (!fs.existsSync(DB)) fs.writeFileSync(DB, '[]');
  return JSON.parse(fs.readFileSync(DB, 'utf8'));
}
function writeDB(data) {
  fs.writeFileSync(DB, JSON.stringify(data, null, 2));
}

/* ── middleware ── */
app.use(cors());
app.use(express.json());

// Serve frontend files
app.use('/user',  express.static(path.join(__dirname, '../frontend/user')));
app.use('/admin', express.static(path.join(__dirname, '../frontend/admin')));

// Root redirect
app.get('/', (req, res) => res.redirect('/user'));

/* ════════════════════════════════════════
   PUBLIC ROUTES  (User portal)
════════════════════════════════════════ */

// POST  /api/register  – submit a registration
app.post('/api/register', (req, res) => {
  const body = req.body;
  const required = [
    'firstName','lastName','email','phone','dob','gender',
    'studentId','department','year','bloodGroup',
    'emergName','emergPhone','emergRel','events'
  ];

  for (const f of required) {
    if (!body[f] || (Array.isArray(body[f]) && body[f].length === 0)) {
      return res.status(400).json({ error: `Missing required field: ${f}` });
    }
  }

  const db   = readDB();
  const entry = {
    id:        Date.now(),
    timestamp: new Date().toLocaleString('en-IN'),
    status:    'pending',   // pending | approved | rejected
    ...body
  };
  db.push(entry);
  writeDB(db);
  res.status(201).json({ success: true, id: entry.id, message: 'Registration submitted!' });
});

// GET  /api/events  – event list (static; extend as needed)
app.get('/api/events', (req, res) => {
  res.json(EVENTS);
});

/* ════════════════════════════════════════
   ADMIN ROUTES  (password-protected stub)
   In production, replace with JWT / sessions.
════════════════════════════════════════ */
const ADMIN_PASSWORD = 'kaiswa1823';   // change this!

function adminAuth(req, res, next) {
  const token = req.headers['x-admin-token'];
  if (token !== ADMIN_PASSWORD) return res.status(401).json({ error: 'Unauthorised' });
  next();
}

// POST  /api/admin/login
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD)
    return res.json({ success: true, token: ADMIN_PASSWORD });
  res.status(401).json({ error: 'Wrong password' });
});

// GET  /api/admin/registrations
app.get('/api/admin/registrations', adminAuth, (req, res) => {
  const db = readDB();
  // optional ?status= filter
  const { status, department, search } = req.query;
  let result = [...db];
  if (status)     result = result.filter(r => r.status === status);
  if (department) result = result.filter(r => r.department === department);
  if (search) {
    const q = search.toLowerCase();
    result = result.filter(r =>
      r.firstName?.toLowerCase().includes(q) ||
      r.lastName?.toLowerCase().includes(q)  ||
      r.email?.toLowerCase().includes(q)     ||
      r.studentId?.toLowerCase().includes(q)
    );
  }
  res.json(result);
});

// PATCH  /api/admin/registrations/:id  – update status or any field
app.patch('/api/admin/registrations/:id', adminAuth, (req, res) => {
  const db  = readDB();
  const idx = db.findIndex(r => r.id === Number(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  db[idx] = { ...db[idx], ...req.body };
  writeDB(db);
  res.json({ success: true, registration: db[idx] });
});

// DELETE  /api/admin/registrations/:id
app.delete('/api/admin/registrations/:id', adminAuth, (req, res) => {
  let db  = readDB();
  const before = db.length;
  db = db.filter(r => r.id !== Number(req.params.id));
  if (db.length === before) return res.status(404).json({ error: 'Not found' });
  writeDB(db);
  res.json({ success: true });
});

// GET  /api/admin/stats
app.get('/api/admin/stats', adminAuth, (req, res) => {
  const db = readDB();
  const total    = db.length;
  const approved = db.filter(r => r.status === 'approved').length;
  const pending  = db.filter(r => r.status === 'pending').length;
  const rejected = db.filter(r => r.status === 'rejected').length;
  const revenue  = db.reduce((s, r) => s + (Number(r.totalFee) || 0), 0);
  res.json({ total, approved, pending, rejected, revenue });
});

// GET  /api/admin/export.csv
app.get('/api/admin/export.csv', adminAuth, (req, res) => {
  const db = readDB();
  const headers = [
    'ID','Timestamp','Status','First Name','Last Name','Email','Phone',
    'DOB','Gender','Student ID','Department','Year','Blood Group',
    'Emerg Name','Emerg Phone','Emerg Rel','Experience','T-Shirt',
    'Medical','Comments','Events','Total Fee'
  ];
  const rows = db.map(r => [
    r.id, r.timestamp, r.status, r.firstName, r.lastName, r.email, r.phone,
    r.dob, r.gender, r.studentId, r.department, r.year, r.bloodGroup,
    r.emergName, r.emergPhone, r.emergRel, r.experience, r.tshirt,
    r.medical, r.comments, `"${(r.events||[]).join('; ')}"`, r.totalFee
  ].map(v => String(v ?? '').replace(/"/g, '""')));

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="registrations.csv"');
  res.send(csv);
});

/* ── start ── */
app.listen(PORT, () => {
  console.log(`\n  ✅  DBIMSCA Sports server running at http://localhost:${PORT}`);
  console.log(`  👤  User portal  → http://localhost:${PORT}/user`);
  console.log(`  🔐  Admin panel  → http://localhost:${PORT}/admin`);
  console.log(`  🔑  Admin pass   → ${ADMIN_PASSWORD}\n`);
});

/* ── event data ── */
const EVENTS = [
  { id:'e1',  sport:'Cricket',     name:'Inter-Dept Cricket Championship', date:'Feb 8–10, 2026',  venue:'Main Ground',        fee:350, slots:120, remaining:43, color:'#1B8A4C', status:'open' },
  { id:'e2',  sport:'Football',    name:'Campus Football League',           date:'Feb 15–16, 2026', venue:'Football Field A',   fee:300, slots:80,  remaining:12, color:'#D63030', status:'limited' },
  { id:'e3',  sport:'Basketball',  name:'3×3 Basketball Showdown',          date:'Feb 22, 2026',    venue:'Indoor Court',       fee:250, slots:60,  remaining:60, color:'#E87722', status:'open' },
  { id:'e4',  sport:'Badminton',   name:'Badminton Singles & Doubles',      date:'Mar 1–2, 2026',   venue:'Sports Hall B',      fee:200, slots:100, remaining:0,  color:'#7C3AED', status:'full' },
  { id:'e5',  sport:'Table Tennis',name:'TT Open Tournament',               date:'Mar 7, 2026',     venue:'Recreation Centre',  fee:150, slots:64,  remaining:29, color:'#0EA5E9', status:'open' },
  { id:'e6',  sport:'Athletics',   name:'Annual Track & Field Meet',        date:'Mar 14–15, 2026', venue:'Athletics Track',    fee:200, slots:200, remaining:88, color:'#F5C518', status:'open' },
  { id:'e7',  sport:'Volleyball',  name:'Volleyball Championship',          date:'Mar 20, 2026',    venue:'Volleyball Court',   fee:280, slots:80,  remaining:24, color:'#10B981', status:'open' },
  { id:'e8',  sport:'Chess',       name:'Rapid Chess Open',                 date:'Mar 28, 2026',    venue:'Academic Block 3',   fee:100, slots:128, remaining:55, color:'#6366F1', status:'open' },
  { id:'e9',  sport:'Swimming',    name:'Inter-College Swim Meet',          date:'Apr 5, 2026',     venue:'Aquatic Centre',     fee:300, slots:50,  remaining:7,  color:'#0284C7', status:'limited' },
  { id:'e10', sport:'Kabaddi',     name:'Kabaddi League',                   date:'Apr 12, 2026',    venue:'Multi-Purpose Court',fee:200, slots:90,  remaining:38, color:'#B45309', status:'open' },
  { id:'e11', sport:'Carrom',      name:'Carrom Doubles Championship',      date:'Apr 18, 2026',    venue:'Common Room',        fee:100, slots:80,  remaining:40, color:'#BE185D', status:'open' },
  { id:'e12', sport:'Cycling',     name:'Campus Cycling Race',              date:'Apr 25, 2026',    venue:'College Circuit',    fee:150, slots:60,  remaining:21, color:'#059669', status:'open' },
];
