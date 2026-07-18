const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const authRoutes     = require('./routes/auth');
const orderRoutes    = require('./routes/orders');
const vendorRoutes   = require('./routes/vendors');
const riderRoutes    = require('./routes/riders');
const paymentRoutes  = require('./routes/payments');
const productRoutes  = require('./routes/products');
const adminRoutes    = require('./routes/admin');

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json());

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100,
  message: { error: 'Too many requests, please try again later.' } });
app.use('/api/', limiter);

app.use('/api/auth',     authRoutes);
app.use('/api/orders',   orderRoutes);
app.use('/api/vendors',  vendorRoutes);
app.use('/api/riders',   riderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/products', productRoutes);
app.use('/api/admin',    adminRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'Kwehu Delivery API', time: new Date().toISOString() });
});

app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

app.use((err, req, res, next) => {
  console.error('[Error]', err.message);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Kwehu Delivery API running on port ${PORT}`));
module.exports = app;
