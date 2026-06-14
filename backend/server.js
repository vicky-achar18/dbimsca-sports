/**
 * DBIMSCA Sports – Backend Server
 * Simple Express + JSON-file "database" (no extra DB needed)
 * Run:  node server.js   (or  npm start)
 * API:  https://dbimsca-sports-1.onrender.com
 */

const express = require('express');
const cors    = require('cors');
const fs      = require('fs');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;
const DB   = path.join(__dirname, '../data/registrations.json');

/* ── base event data (slots = total capacity) ── */
const BASE_EVENTS = [
  { id:'e1',  sport:'Cricket',      name:'Inter-Dept Cricket Championship', date:'Feb 8–10, 2026',  venue:'Main Ground',         fee:350, slots:120, color:'#1B8A4C' },
  { id:'e2',  sport:'Football',     name:'Campus Football League',          date:'Feb 15–16, 2026', venue:'Football Field A',    fee:300, slots:80,  color:'#D63030' },
  { id:'e3',  sport:'Basketball',   name:'3×3 Basketball Showdown',         date:'Feb 22, 2026',    venue:'Indoor Court',        fee:250, slots:60,  color:'#E87722' },
  { id:'e4',  sport:'Badminton',    name:'Badminton Singles & Doubles',     date:'Mar 1–2, 2026',   venue:'Sports Hall B',       fee:200, slots:100, color:'#7C3AED' },
  { id:'e5',  sport:'Table Tennis', name:'TT Open Tournament',              date:'Mar 7, 2026',     venue:'Recreation Centre',   fee:150, slots:64,  color:'#0EA5E9' },
  { id:'e6',  sport:'Athletics',    name:'Annual Track & Field Meet',       date:'Mar 14–15, 2026', venue:'Athletics Track',     fee:200, slots:200, color:'#F5C518' },
  { id:'e7',  sport:'Volleyball',   name:'Volleyball Championship',         date:'Mar 20, 2026',    venue:'Volleyball Court',    fee:280, slots:80,  color:'#10B981' },
  { id:'e8',  sport:'Chess',        name:'Rapid Chess Open',                date:'Mar 28, 2026',    venue:'Academic Block 3',    fee:100, slots:128, color:'#6366F1' },
  { id:'e9',  sport:'Swimming',     name:'Inter-College Swim Meet',         date:'Apr 5, 2026',     venue:'Aquatic Centre',      fee:300, slots:50,  color:'#0284C7' },
  { id:'e10', sport:'Kabaddi',      name:'Kabaddi League',                  date:'Apr 12, 2026',    venue:'Multi-Purpose Court', fee:200, slots:90,  color:'#B45309' },
  { id:'e11', sport:'Carrom',       name:'Carrom Doubles Championship',     date:'Apr 18, 2026',    venue:'Common Room',         fee:100, slots:80,  color:'#BE185D' },
  { id:'e12', sport:'Cycling',      name:'Campus Cycling Race',             date:'Apr 25, 2026',    venue:'College Circuit',     fee:150, slots:60,  color:'#059669' },
];

/* ── helpers ── */
function readDB() {
  if (!fs.existsSync(DB)) fs.writeFileSync(DB, '[]');
  return JSON.parse(fs.readFileSync(DB, 'utf8'));
}
function writeDB(data) {
  fs.writeFileSync(DB, JSON.stringify(data, null, 2));
}

// Calculate remaining slots dynamically from registrations
// Only approved + pending registrations occupy a slot; rejected ones free it up
function getEvents() {
  const registrations = readDB();
  return BASE_EVENTS.map(ev => {
    const taken = registrations.filter(r =>
      r.status !== 'rejected' && (r.events || []).includes(ev.id)
    ).length;
    const remaining = Math.max(0, ev.slots - taken);
    let status = 'open';
    if (remaining === 0) status = 'full';
    else if (remaining <= ev.slots * 0.2) status = 'limited';
    return { ...ev, remaining, status };
  });
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

// GET  /api/events  – live event list with real remaining slots
app.get('/api/events', (req, res) => {
  res.json(getEvents());
});

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

  // Check if any selected event is full
  const events = getEvents();
  const fullEvents = (body.events || []).filter(eventId => {
    const ev = events.find(e => e.id === eventId);
    return ev && ev.status === 'full';
  });
  if (fullEvents.length > 0) {
    const names = fullEvents.map(id => events.find(e => e.id === id)?.sport).join(', ');
    return res.status(400).json({ error: `Sorry, the following events are full: ${names}` });
  }

  const db = readDB();
  const entry = {
    id:        Date.now(),
    timestamp: new Date().toLocaleString('en-IN'),
    status:    'pending',
    ...body
  };
  db.push(entry);
  writeDB(db);
  res.status(201).json({ success: true, id: entry.id, message: 'Registration submitted!' });
});

/* ════════════════════════════════════════
   ADMIN ROUTES
════════════════════════════════════════ */
const ADMIN_PASSWORD = 'kaiswa1823';

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

// PATCH  /api/admin/registrations/:id  – approve / reject / update
// Slots are recalculated live from registrations, so no manual slot update needed here
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
  let db = readDB();
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
  console.log(`\n  ✅  DBIMSCA Sports server running on port ${PORT}`);
  console.log(`  👤  User portal  → /user`);
  console.log(`  🔐  Admin panel  → /admin`);
  console.log(`  🔑  Admin pass   → ${ADMIN_PASSWORD}\n`);
});
