const express = require('express');
const router = express.Router();
const { requireAuth } = require('./auth');
const { db, save, nextId } = require('../database/connection');

router.use(requireAuth);

router.get('/', (req, res) => {
  const { status } = req.query;
  let rows = db.requests.slice();
  if (status) rows = rows.filter(r => r.status === status);
  rows.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
  res.json(rows);
});

router.post('/', (req, res) => {
  const b = req.body || {};
  const details = String(b.details || '').trim();
  if (!details) return res.status(400).json({ error: 'Details are required.' });
  const type = String(b.request_type || 'other');
  const allowed = ['table_preference', 'dietary', 'special_occasion', 'service', 'other'];
  if (!allowed.includes(type)) return res.status(400).json({ error: 'Invalid request type.' });

  const record = {
    id: nextId('requests'),
    customer_id: b.customer_id ? Number(b.customer_id) : null,
    customer_name: String(b.customer_name || '').trim() || null,
    customer_phone: String(b.customer_phone || '').trim() || null,
    reservation_id: b.reservation_id ? Number(b.reservation_id) : null,
    request_type: type,
    details,
    status: 'open',
    created_at: new Date().toISOString()
  };
  db.requests.push(record);
  save();
  res.status(201).json(record);
});

router.put('/:id', (req, res) => {
  const r = db.requests.find(x => x.id === Number(req.params.id));
  if (!r) return res.status(404).json({ error: 'Request not found.' });
  const b = req.body || {};
  const allowed = ['open', 'in_progress', 'resolved', 'cancelled'];
  if (b.status != null) {
    if (!allowed.includes(b.status)) return res.status(400).json({ error: 'Invalid status.' });
    r.status = b.status;
  }
  if (b.details != null) r.details = String(b.details).trim();
  if (b.request_type != null) r.request_type = b.request_type;
  save();
  res.json(r);
});

router.delete('/:id', (req, res) => {
  const id = Number(req.params.id);
  const exists = db.requests.some(r => r.id === id);
  if (!exists) return res.status(404).json({ error: 'Request not found.' });
  db.requests = db.requests.filter(r => r.id !== id);
  save();
  res.json({ ok: true });
});

module.exports = router;
