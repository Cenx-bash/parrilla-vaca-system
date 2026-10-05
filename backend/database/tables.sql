-- Reference schema for the Parrilla Vaca reservation system.
-- The demo runs on a JSON store (data.json), but this reflects the intended relational model.
CREATE TABLE
    users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        full_name TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'staff' -- 'admin' | 'staff'
    );

CREATE TABLE
    customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        full_name TEXT NOT NULL,
        phone TEXT,
        email TEXT,
        notes TEXT
    );

CREATE TABLE
    tables (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT NOT NULL UNIQUE,
        capacity INTEGER NOT NULL,
        location TEXT,
        status TEXT NOT NULL DEFAULT 'active' -- 'active' | 'inactive'
    );

CREATE TABLE
    reservations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id INTEGER REFERENCES customers (id),
        customer_name TEXT NOT NULL,
        customer_phone TEXT,
        customer_email TEXT,
        reservation_date TEXT NOT NULL, -- YYYY-MM-DD
        reservation_time TEXT NOT NULL, -- HH:MM
        guest_count INTEGER NOT NULL,
        table_id INTEGER REFERENCES tables (id),
        status TEXT NOT NULL DEFAULT 'pending',
        notes TEXT,
        walk_in INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
    );

CREATE TABLE
    requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id INTEGER REFERENCES customers (id),
        customer_name TEXT,
        customer_phone TEXT,
        reservation_id INTEGER REFERENCES reservations (id),
        request_type TEXT NOT NULL,
        details TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'open',
        created_at TEXT NOT NULL
    );

CREATE INDEX idx_res_date ON reservations (reservation_date);

CREATE INDEX idx_res_table ON reservations (table_id, reservation_date, reservation_time);

CREATE INDEX idx_req_stat ON requests (status);