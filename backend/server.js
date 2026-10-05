const express = require('express');
const session = require('express-session');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(session({
  secret: 'parrilla-vaca-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', maxAge: 1000 * 60 * 60 * 8 }
}));

// Static frontend
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// API
const { router: authRouter } = require('./routes/auth');

app.use('/api/auth',         authRouter);
app.use('/api/customers',    require('./routes/customers'));
app.use('/api/reservations', require('./routes/reservations'));
app.use('/api/tables',       require('./routes/tables'));
app.use('/api/requests',     require('./routes/requests'));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

app.use((err, req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Server error.' });
});

app.listen(PORT, () => {
  console.log(`Parrilla Vaca system running at http://localhost:${PORT}`);
});
