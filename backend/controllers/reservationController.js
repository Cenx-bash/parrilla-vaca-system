const { db, save, nextId } = require('../database/connection');

const OPEN_STATUSES = ['pending', 'confirmed', 'completed'];

function enrich(r) {
  const table = r.table_id ? db.tables.find(t => t.id === r.table_id) : null;
  return { ...r, table_code: table ? table.code : null };
}

function conflict(tableId, date, time, excludeId = null) {
  if (!tableId) return null;
  const [h, m] = String(time).split(':').map(Number);
  const target = h * 60 + m;
  return db.reservations.find(r => {
    if (excludeId && r.id === excludeId) return false;
    if (r.table_id !== tableId) return false;
    if (r.reservation_date !== date) return false;
    if (['cancelled', 'no_show'].includes(r.status)) return false;
    const [rh, rm] = String(r.reservation_time).split(':').map(Number);
    return Math.abs((rh * 60 + rm) - target) < 120;
  }) || null;
}

exports.list = (req, res) => {
  const { date, status, q } = req.query;
  let rows = db.reservations.slice();
  if (date) rows = rows.filter(r => r.reservation_date === date);
  if (status) rows = rows.filter(r => r.status === status);
  if (q) {
    const needle = String(q).toLowerCase();
    rows = rows.filter(r =>
      (r.customer_name || '').toLowerCase().includes(needle) ||
      (r.customer_phone || '').toLowerCase().includes(needle)
    );
  }
  rows.sort((a, b) => (a.reservation_date + a.reservation_time).localeCompare(b.reservation_date + b.reservation_time));
  res.json(rows.map(enrich));
};

exports.get = (req, res) => {
  const r = db.reservations.find(x => x.id === Number(req.params.id));
  if (!r) return res.status(404).json({ error: 'Reservation not found.' });
  res.json(enrich(r));
};

exports.today = (req, res) => {
  const d = new Date();
  const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const rows = db.reservations
    .filter(r => r.reservation_date === today)
    .sort((a, b) => a.reservation_time.localeCompare(b.reservation_time));
  res.json(rows.map(enrich));
};

exports.stats = (req, res) => {
  const d = new Date();
  const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const todays = db.reservations.filter(r => r.reservation_date === today);
  const open = db.requests.filter(r => r.status === 'open').length;
  res.json({
    today: {
      total: todays.length,
      confirmed: todays.filter(r => r.status === 'confirmed').length,
      pending: todays.filter(r => r.status === 'pending').length,
      guests: todays.filter(r => OPEN_STATUSES.includes(r.status)).reduce((s, r) => s + r.guest_count, 0)
    },
    tables: {
      total: db.tables.filter(t => t.status === 'active').length,
      available: db.tables.filter(t => t.status === 'active').length
    },
    requests: { open }
  });
};

exports.report = (req, res) => {
  const { from, to } = req.query;
  let rows = db.reservations.slice();
  if (from) rows = rows.filter(r => r.reservation_date >= from);
  if (to) rows = rows.filter(r => r.reservation_date <= to);

  const totalGuests = rows.reduce((s, r) => s + r.guest_count, 0);
  const completed = rows.filter(r => r.status === 'completed');
  const cancelled = rows.filter(r => r.status === 'cancelled');
  const noShow = rows.filter(r => r.status === 'no_show');

  const statusCounts = {};
  rows.forEach(r => { statusCounts[r.status] = (statusCounts[r.status] || 0) + 1; });
  const by_status = Object.keys(statusCounts).map(k => ({ status: k, count: statusCounts[k] }));

  const hourCounts = {};
  rows.forEach(r => {
    const h = Number(String(r.reservation_time).split(':')[0]);
    if (!isNaN(h)) hourCounts[h] = (hourCounts[h] || 0) + 1;
  });
  const by_hour = Object.keys(hourCounts)
    .map(k => ({ hour: Number(k), count: hourCounts[k] }))
    .sort((a, b) => a.hour - b.hour);

  const customerMap = {};
  rows.forEach(r => {
    const key = r.customer_name || 'Walk-in';
    if (!customerMap[key]) customerMap[key] = { name: key, visits: 0, guests: 0 };
    customerMap[key].visits += 1;
    customerMap[key].guests += r.guest_count;
  });
  const top_customers = Object.values(customerMap)
    .sort((a, b) => b.visits - a.visits || b.guests - a.guests)
    .slice(0, 5);

  res.json({
    summary: {
      reservations: rows.length,
      guests: totalGuests,
      avg_party: rows.length ? +(totalGuests / rows.length).toFixed(1) : 0,
      completed: completed.length,
      cancelled: cancelled.length,
      no_show: noShow.length,
      completion_rate: rows.length ? Math.round((completed.length / rows.length) * 100) : 0
    },
    by_status,
    by_hour,
    top_customers
  });
};

exports.create = (req, res) => {
  const b = req.body || {};
  const name = String(b.customer_name || '').trim();
  if (!name) return res.status(400).json({ error: 'Guest name is required.' });
  if (!b.reservation_date) return res.status(400).json({ error: 'Reservation date is required.' });
  if (!b.reservation_time) return res.status(400).json({ error: 'Reservation time is required.' });
  const guests = Number(b.guest_count);
  if (!guests || guests < 1) return res.status(400).json({ error: 'Party size must be at least 1.' });

  const tableId = b.table_id ? Number(b.table_id) : null;
  const clash = conflict(tableId, b.reservation_date, b.reservation_time);
  if (clash) {
    return res.status(409).json({
      error: `Table is already booked at ${clash.reservation_time} on that date.`
    });
  }

  const record = {
    id: nextId('reservations'),
    customer_id: b.customer_id ? Number(b.customer_id) : null,
    customer_name: name,
    customer_phone: String(b.customer_phone || '').trim(),
    customer_email: String(b.customer_email || '').trim(),
    reservation_date: b.reservation_date,
    reservation_time: b.reservation_time,
    guest_count: guests,
    table_id: tableId,
    status: b.status || 'pending',
    notes: String(b.notes || '').trim(),
    walk_in: b.walk_in === true || b.walk_in === 'yes',
    created_at: new Date().toISOString()
  };

  // link or create customer record
  if (record.customer_id) {
    const existing = db.customers.find(c => c.id === record.customer_id);
    if (existing) {
      existing.full_name = existing.full_name || record.customer_name;
      if (!existing.phone && record.customer_phone) existing.phone = record.customer_phone;
      if (!existing.email && record.customer_email) existing.email = record.customer_email;
    }
  } else if (record.customer_phone) {
    const match = db.customers.find(c => c.phone && c.phone === record.customer_phone);
    if (match) record.customer_id = match.id;
  }

  db.reservations.push(record);
  save();
  res.status(201).json(enrich(record));
};

exports.update = (req, res) => {
  const r = db.reservations.find(x => x.id === Number(req.params.id));
  if (!r) return res.status(404).json({ error: 'Reservation not found.' });

  const b = req.body || {};
  const nextDate  = b.reservation_date  != null ? b.reservation_date  : r.reservation_date;
  const nextTime  = b.reservation_time  != null ? b.reservation_time  : r.reservation_time;
  const nextTable = b.table_id != null ? (b.table_id ? Number(b.table_id) : null) : r.table_id;

  if (nextDate !== r.reservation_date || nextTime !== r.reservation_time || nextTable !== r.table_id) {
    const clash = conflict(nextTable, nextDate, nextTime, r.id);
    if (clash) return res.status(409).json({ error: 'That table is already booked within 2 hours of this time.' });
  }

  if (b.customer_name   != null) r.customer_name   = String(b.customer_name).trim();
  if (b.customer_phone  != null) r.customer_phone  = String(b.customer_phone).trim();
  if (b.customer_email  != null) r.customer_email  = String(b.customer_email).trim();
  if (b.customer_id     != null) r.customer_id     = b.customer_id ? Number(b.customer_id) : null;
  if (b.reservation_date != null) r.reservation_date = nextDate;
  if (b.reservation_time != null) r.reservation_time = nextTime;
  if (b.guest_count     != null) r.guest_count     = Math.max(1, Number(b.guest_count) || 1);
  if (b.table_id        != null) r.table_id        = nextTable;
  if (b.status          != null) r.status          = b.status;
  if (b.notes           != null) r.notes           = String(b.notes).trim();
  if (b.walk_in         != null) r.walk_in         = b.walk_in === true || b.walk_in === 'yes';

  save();
  res.json(enrich(r));
};

exports.remove = (req, res) => {
  const id = Number(req.params.id);
  const exists = db.reservations.some(r => r.id === id);
  if (!exists) return res.status(404).json({ error: 'Reservation not found.' });
  db.reservations = db.reservations.filter(r => r.id !== id);
  db.requests = db.requests.filter(q => q.reservation_id !== id);
  save();
  res.json({ ok: true });
};