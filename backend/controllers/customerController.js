const { db, save, nextId } = require('../database/connection');

function enrich(c) {
  const completed = db.reservations.filter(r => r.customer_id === c.id && r.status === 'completed');
  const last = completed.map(r => r.reservation_date).sort().pop() || null;
  return { ...c, visits: completed.length, last_visit: last };
}

exports.list = (req, res) => {
  const q = String(req.query.q || '').toLowerCase().trim();
  let rows = db.customers.slice();
  if (q) {
    rows = rows.filter(c =>
      (c.full_name || '').toLowerCase().includes(q) ||
      (c.phone || '').toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q)
    );
  }
  rows.sort((a, b) => a.full_name.localeCompare(b.full_name));
  res.json(rows.map(enrich));
};

exports.get = (req, res) => {
  const c = db.customers.find(x => x.id === Number(req.params.id));
  if (!c) return res.status(404).json({ error: 'Customer not found.' });
  res.json(enrich(c));
};

exports.create = (req, res) => {
  const { full_name, phone = '', email = '', notes = '' } = req.body || {};
  if (!full_name || !full_name.trim()) return res.status(400).json({ error: 'Full name is required.' });
  const record = {
    id: nextId('customers'),
    full_name: full_name.trim(),
    phone: phone.trim(),
    email: email.trim(),
    notes: notes.trim()
  };
  db.customers.push(record);
  save();
  res.status(201).json(enrich(record));
};

exports.update = (req, res) => {
  const c = db.customers.find(x => x.id === Number(req.params.id));
  if (!c) return res.status(404).json({ error: 'Customer not found.' });
  const { full_name, phone, email, notes } = req.body || {};
  if (full_name != null) {
    if (!String(full_name).trim()) return res.status(400).json({ error: 'Full name cannot be empty.' });
    c.full_name = String(full_name).trim();
  }
  if (phone != null) c.phone = String(phone).trim();
  if (email != null) c.email = String(email).trim();
  if (notes != null) c.notes = String(notes).trim();
  save();
  res.json(enrich(c));
};

exports.remove = (req, res) => {
  const id = Number(req.params.id);
  const c = db.customers.find(x => x.id === id);
  if (!c) return res.status(404).json({ error: 'Customer not found.' });
  const used = db.reservations.some(r => r.customer_id === id);
  if (used) return res.status(400).json({ error: 'Customer has reservations on record and cannot be deleted.' });
  db.customers = db.customers.filter(x => x.id !== id);
  save();
  res.json({ ok: true });
};