/**
 * userRoutes.js — Express Router
 *
 * Maps HTTP methods + paths to the corresponding controller functions.
 */

const express = require('express');
const router = express.Router();

const {
  createUser,
  getAllUsers,
  updateUser,
  deleteUser,
  searchUsers,
} = require('../controllers/userController');

// ─── User CRUD ──────────────────────────────────────────────────────────────
router.post('/users', createUser);      // Create a new user
router.get('/users', getAllUsers);       // Get all users
router.patch('/users/:id', updateUser); // Update a user by ID
router.delete('/users/:id', deleteUser);// Delete a user by ID

// ─── Geospatial Search ─────────────────────────────────────────────────────
router.get('/search', searchUsers);     // Search users by coordinates

module.exports = router;
