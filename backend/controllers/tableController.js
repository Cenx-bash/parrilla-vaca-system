const { db, save, nextId } = require('../database/connection');

exports.list = (req, res) => {
  const rows = db.tables.slice().sort((a, b) => a.code.localeCompare(b.code));
  res.json(rows);
};

exports.create = (req, res) => {
  const { code, capacity, location = '', status = 'active' } = req.body || {};
  if (!code || !String(code).trim()) return res.status(400).json({ error: 'Table code is required.' });
  const cap = Number(capacity);
  if (!cap || cap < 1) return res.status(400).json({ error: 'Capacity must be at least 1.' });

  const normalized = String(code).trim().toUpperCase();
  if (db.tables.some(t => t.code === normalized)) {
    return res.status(400).json({ error: 'Table code already exists.' });
  }

  const record = {
    id: nextId('tables'),
    code: normalized,
    capacity: cap,
    location: String(location).trim(),
    status: status === 'inactive' ? 'inactive' : 'active'
  };
  db.tables.push(record);
  save();
  res.status(201).json(record);
};

exports.update = (req, res) => {
  const t = db.tables.find(x => x.id === Number(req.params.id));
  if (!t) return res.status(404).json({ error: 'Table not found.' });
  const { code, capacity, location, status } = req.body || {};

  if (code != null) {
    const normalized = String(code).trim().toUpperCase();
    if (!normalized) return res.status(400).json({ error: 'Table code cannot be empty.' });
    if (db.tables.some(x => x.id !== t.id && x.code === normalized)) {
      return res.status(400).json({ error: 'Another table already uses that code.' });
    }
    t.code = normalized;
  }
  if (capacity != null) {
    const cap = Number(capacity);
    if (!cap || cap < 1) return res.status(400).json({ error: 'Capacity must be at least 1.' });
    t.capacity = cap;
  }
  if (location != null) t.location = String(location).trim();
  if (status != null) t.status = status === 'inactive' ? 'inactive' : 'active';

  save();
  res.json(t);
};

exports.remove = (req, res) => {
  const id = Number(req.params.id);
  const t = db.tables.find(x => x.id === id);
  if (!t) return res.status(404).json({ error: 'Table not found.' });
  const used = db.reservations.some(r => r.table_id === id && !['cancelled', 'completed'].includes(r.status));
  if (used) return res.status(400).json({ error: 'Table has active reservations. Deactivate it instead.' });
  db.tables = db.tables.filter(x => x.id !== id);
  save();
  res.json({ ok: true });
};

exports.availability = (req, res) => {
  const { date, time, guests } = req.query;
  if (!date || !time) return res.status(400).json({ error: 'Date and time are required.' });
  const cap = Number(guests) || 1;

  const list = db.tables
    .filter(t => t.status === 'active' && t.capacity >= cap)
    .sort((a, b) => a.capacity - b.capacity || a.code.localeCompare(b.code))
    .map(t => {
      const [h, m] = String(time).split(':').map(Number);
      const target = h * 60 + m;
      const booked = db.reservations.some(r => {
        if (r.table_id !== t.id) return false;
        if (r.reservation_date !== date) return false;
        if (['cancelled', 'no_show'].includes(r.status)) return false;
        const [rh, rm] = String(r.reservation_time).split(':').map(Number);
        return Math.abs((rh * 60 + rm) - target) < 120;
      });
      return { ...t, available: !booked };
    });

  res.json(list);
};