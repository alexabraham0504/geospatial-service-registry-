/**
 * server.js — Application Entry Point
 *
 * Loads environment variables, connects to MongoDB, and starts the
 * Express HTTP server.
 *
 * Security & reliability features:
 *  - CORS enabled for frontend connectivity
 *  - JSON body size limited to 10 KB to prevent payload abuse
 *  - Malformed JSON returns a clean 400 instead of crashing
 *  - 404 catch-all for undefined routes
 *  - Global error handler as a safety net
 */

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

// Load variables from .env into process.env
dotenv.config();

const userRoutes = require('./routes/userRoutes');

// ─── App Setup ──────────────────────────────────────────────────────────────
const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI =
  process.env.MONGO_URI || 'mongodb://localhost:27017/geo-service-registry';

// ─── Middleware ──────────────────────────────────────────────────────────────
app.use(cors());                          // Allow cross-origin requests
app.use(express.json({ limit: '10kb' })); // Parse JSON, limit payload size

// ─── Handle malformed JSON gracefully ───────────────────────────────────────
app.use((err, _req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res
      .status(400)
      .json({ success: false, message: 'Invalid JSON in request body' });
  }
  next(err);
});

// ─── Routes ─────────────────────────────────────────────────────────────────
app.use('/', userRoutes);

// Root health-check endpoint
app.get('/', (_req, res) => {
  res.json({
    success: true,
    message: 'Geospatial Service Registry API is running 🚀',
    endpoints: {
      'POST   /users': 'Create a new user',
      'GET    /users': 'Get all users',
      'PATCH  /users/:id': 'Update a user',
      'DELETE /users/:id': 'Delete a user',
      'GET    /search?lat=&long=': 'Search users by coordinates',
    },
  });
});

// ─── 404 catch-all for undefined routes ─────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// ─── Global error handler (safety net) ──────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
  });
});

// ─── Database Connection & Server Start ─────────────────────────────────────
mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB');
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });
