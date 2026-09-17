require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const imageRoutes = require('./routes/imageRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_ORIGIN || '*' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json());

// Basic abuse protection on the upload-heavy route.
const uploadLimiter = rateLimit({ windowMs: 60 * 1000, max: 30 });
app.use('/api/images', uploadLimiter, imageRoutes);

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use((req, res) => res.status(404).json({ error: 'NOT_FOUND' }));
app.use(errorHandler);

module.exports = app;
