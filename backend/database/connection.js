const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'data.json');

const blank = () => ({
  users: [], customers: [], tables: [], reservations: [], requests: [],
  nextIds: { users: 1, customers: 1, tables: 1, reservations: 1, requests: 1 }
});

let db = blank();

function load() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
      db = { ...blank(), ...parsed };
      db.nextIds = { ...blank().nextIds, ...(parsed.nextIds || {}) };
    }
  } catch (e) {
    console.error('[db] load failed:', e.message);
  }
}

function save() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
  } catch (e) {
    console.error('[db] save failed:', e.message);
  }
}

function nextId(key) {
  const id = db.nextIds[key] || 1;
  db.nextIds[key] = id + 1;
  return id;
}

function seed() {
  db.users = [
    { id: nextId('users'), username: 'admin', password: 'admin123', full_name: 'Restaurant Manager', role: 'admin' },
    { id: nextId('users'), username: 'staff', password: 'staff123', full_name: 'Front of House',   role: 'staff' }
  ];

  const seedTables = [
    { code: 'T01', capacity: 2, location: 'Main hall' },
    { code: 'T02', capacity: 2, location: 'Main hall' },
    { code: 'T03', capacity: 4, location: 'Main hall' },
    { code: 'T04', capacity: 4, location: 'Veranda'   },
    { code: 'T05', capacity: 6, location: 'Veranda'   },
    { code: 'T06', capacity: 8, location: 'VIP room'  }
  ];
  db.tables = seedTables.map(t => ({ id: nextId('tables'), status: 'active', ...t }));

  db.customers = [
    { id: nextId('customers'), full_name: 'Juan Dela Cruz', phone: '09171234567', email: 'juan@email.com', notes: '' },
    { id: nextId('customers'), full_name: 'Maria Santos',   phone: '09181234567', email: 'maria@email.com', notes: 'Prefers window seat' }
  ];

  const d = new Date();
  const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const now = new Date().toISOString();

  db.reservations = [
    {
      id: nextId('reservations'), customer_id: 1,
      customer_name: 'Juan Dela Cruz', customer_phone: '09171234567', customer_email: 'juan@email.com',
      reservation_date: today, reservation_time: '19:00', guest_count: 2,
      table_id: 1, status: 'confirmed', notes: 'Anniversary dinner', walk_in: false, created_at: now
    },
    {
      id: nextId('reservations'), customer_id: 2,
      customer_name: 'Maria Santos', customer_phone: '09181234567', customer_email: 'maria@email.com',
      reservation_date: today, reservation_time: '20:00', guest_count: 4,
      table_id: 3, status: 'pending', notes: '', walk_in: false, created_at: now
    }
  ];

  db.requests = [
    {
      id: nextId('requests'), customer_id: 1,
      customer_name: 'Juan Dela Cruz', customer_phone: '09171234567',
      reservation_id: 1, request_type: 'special_occasion',
      details: 'Please prepare a small candle on the table.', status: 'open', created_at: now
    }
  ];

  save();
}

load();
if (!db.users.length) seed();

module.exports = { db, save, nextId };