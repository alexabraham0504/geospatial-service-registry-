/**
 * userController.js — Request Handlers
 *
 * Contains all controller functions for the /users and /search endpoints.
 * Each handler validates input, interacts with the database, and returns
 * a **consistent** JSON response:
 *
 *   Success → { success: true,  data: ... }
 *   Error   → { success: false, message: "..." }
 *
 * Validation is enforced at the controller level (before Mongoose) so that
 * we can return clear, user-friendly 400 responses.
 */

const mongoose = require('mongoose');
const User = require('../models/User');
const { calculateDistance } = require('../utils/distance');

// ─── Constants ──────────────────────────────────────────────────────────────

const NAME_MAX_LENGTH = 100; // Max characters allowed for user name
const ALLOWED_UPDATE_FIELDS = ['name', 'latitude', 'longitude', 'service_radius'];

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Check whether a value is a valid MongoDB ObjectId.
 *
 * mongoose.Types.ObjectId.isValid() returns true for any 12-byte string,
 * so we also verify that casting back produces the same string.
 *
 * @param {string} id
 * @returns {boolean}
 */
const isValidObjectId = (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) return false;
  // Double-check: cast and compare to catch false positives like "123456789012"
  return String(new mongoose.Types.ObjectId(id)) === id;
};

/**
 * Validate latitude, longitude, and (optionally) service_radius values.
 * Returns an error message string if invalid, or null if everything is OK.
 *
 * @param {object}  fields
 * @param {*}       [fields.latitude]
 * @param {*}       [fields.longitude]
 * @param {*}       [fields.service_radius]
 * @param {boolean} [requireAll=false]  When true every field must be provided.
 * @returns {string|null} Error message or null
 */
const validateGeoFields = (
  { latitude, longitude, service_radius },
  requireAll = false
) => {
  // --- Presence checks (only when creating) ---
  if (requireAll) {
    if (latitude === undefined || latitude === null)
      return 'Latitude is required';
    if (longitude === undefined || longitude === null)
      return 'Longitude is required';
    if (service_radius === undefined || service_radius === null)
      return 'Service radius is required';
  }

  // --- Type & range checks (only for fields that were provided) ---
  if (latitude !== undefined && latitude !== null) {
    if (typeof latitude !== 'number' || !Number.isFinite(latitude))
      return 'Latitude must be a valid finite number';
    if (latitude < -90 || latitude > 90)
      return 'Latitude must be between -90 and 90';
  }

  if (longitude !== undefined && longitude !== null) {
    if (typeof longitude !== 'number' || !Number.isFinite(longitude))
      return 'Longitude must be a valid finite number';
    if (longitude < -180 || longitude > 180)
      return 'Longitude must be between -180 and 180';
  }

  if (service_radius !== undefined && service_radius !== null) {
    if (typeof service_radius !== 'number' || !Number.isFinite(service_radius))
      return 'Service radius must be a valid finite number';
    if (service_radius <= 0)
      return 'Service radius must be a positive number greater than 0';
  }

  return null; // All good ✅
};

/**
 * Sanitize a string: trim whitespace and remove control characters.
 * @param {string} str
 * @returns {string}
 */
const sanitizeString = (str) =>
  typeof str === 'string'
    ? str.trim().replace(/[\x00-\x1F\x7F]/g, '') // strip control chars
    : '';

/**
 * Pick only the allowed fields from an object.
 * Prevents clients from injecting unexpected fields (e.g. _id, __v).
 * @param {object} body
 * @param {string[]} allowed
 * @returns {object}
 */
const pickAllowedFields = (body, allowed) => {
  const sanitized = {};
  for (const key of allowed) {
    if (body[key] !== undefined) {
      sanitized[key] = key === 'name' ? sanitizeString(body[key]) : body[key];
    }
  }
  return sanitized;
};

// ─── Controllers ────────────────────────────────────────────────────────────

/**
 * POST /users — Create a new user.
 *
 * Required body: { name, latitude, longitude, service_radius }
 */
const createUser = async (req, res) => {
  try {
    const { name, latitude, longitude, service_radius } = req.body;

    // ── Name validation ─────────────────────────────────────────────────
    const cleanName = sanitizeString(name);
    if (!cleanName) {
      return res
        .status(400)
        .json({ success: false, message: 'Name is required' });
    }
    if (cleanName.length > NAME_MAX_LENGTH) {
      return res.status(400).json({
        success: false,
        message: `Name must be at most ${NAME_MAX_LENGTH} characters`,
      });
    }

    // ── Geographic field validation (all required for creation) ─────────
    const geoError = validateGeoFields(
      { latitude, longitude, service_radius },
      true
    );
    if (geoError) {
      return res.status(400).json({ success: false, message: geoError });
    }

    // ── Create the user ─────────────────────────────────────────────────
    const user = await User.create({
      name: cleanName,
      latitude,
      longitude,
      service_radius,
    });

    return res.status(201).json({ success: true, data: user });
  } catch (err) {
    // Mongoose validation errors → 400
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map((e) => e.message);
      return res
        .status(400)
        .json({ success: false, message: messages.join('; ') });
    }
    return res
      .status(500)
      .json({ success: false, message: 'Internal server error' });
  }
};

/**
 * GET /users — Retrieve all users, newest first.
 */
const getAllUsers = async (_req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    return res.status(200).json({ success: true, data: users });
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: 'Internal server error' });
  }
};

/**
 * PATCH /users/:id — Partially update an existing user.
 *
 * Only whitelisted fields (name, latitude, longitude, service_radius) are
 * accepted; all other keys in the body are silently ignored for security.
 */
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;

    // ── Validate ObjectId ───────────────────────────────────────────────
    if (!isValidObjectId(id)) {
      return res
        .status(400)
        .json({ success: false, message: 'Invalid user ID format' });
    }

    // ── Sanitize body: only allow known fields ──────────────────────────
    const updateData = pickAllowedFields(req.body, ALLOWED_UPDATE_FIELDS);

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message:
          'No valid fields to update. Allowed: name, latitude, longitude, service_radius',
      });
    }

    // ── Name length check (if provided) ─────────────────────────────────
    if (updateData.name !== undefined) {
      if (!updateData.name) {
        return res
          .status(400)
          .json({ success: false, message: 'Name cannot be empty' });
      }
      if (updateData.name.length > NAME_MAX_LENGTH) {
        return res.status(400).json({
          success: false,
          message: `Name must be at most ${NAME_MAX_LENGTH} characters`,
        });
      }
    }

    // ── Validate any geo fields that were provided ──────────────────────
    const geoError = validateGeoFields(updateData, false);
    if (geoError) {
      return res.status(400).json({ success: false, message: geoError });
    }

    // ── Perform update ──────────────────────────────────────────────────
    const updatedUser = await User.findByIdAndUpdate(id, updateData, {
      new: true, // return the updated document
      runValidators: true, // run Mongoose schema validators
    });

    if (!updatedUser) {
      return res
        .status(404)
        .json({ success: false, message: 'User not found' });
    }

    return res.status(200).json({ success: true, data: updatedUser });
  } catch (err) {
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map((e) => e.message);
      return res
        .status(400)
        .json({ success: false, message: messages.join('; ') });
    }
    return res
      .status(500)
      .json({ success: false, message: 'Internal server error' });
  }
};

/**
 * DELETE /users/:id — Delete a user by ID.
 */
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res
        .status(400)
        .json({ success: false, message: 'Invalid user ID format' });
    }

    const deletedUser = await User.findByIdAndDelete(id);

    if (!deletedUser) {
      return res
        .status(404)
        .json({ success: false, message: 'User not found' });
    }

    return res.status(200).json({ success: true, data: deletedUser });
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: 'Internal server error' });
  }
};

/**
 * GET /search?lat=<number>&long=<number>
 *
 * Find all users whose service_radius covers the given coordinates.
 *
 * How it works:
 *   1. Parse & validate the `lat` and `long` query parameters.
 *   2. Fetch every user from the database.
 *   3. For each user, compute the Haversine distance from the query point
 *      to the user's location.
 *   4. Keep only users where distance ≤ service_radius.
 *   5. Return them sorted by distance (closest first).
 *
 * An empty result set is perfectly valid and returns { success: true, data: [] }.
 */
const searchUsers = async (req, res) => {
  try {
    const { lat, long: lon } = req.query;

    // ── Presence check ──────────────────────────────────────────────────
    if (lat === undefined || lat === '' || lon === undefined || lon === '') {
      return res.status(400).json({
        success: false,
        message: 'Both "lat" and "long" query parameters are required',
      });
    }

    // ── Explicit conversion with Number() for type safety ───────────────
    const latitude = Number(lat);
    const longitude = Number(lon);

    if (!Number.isFinite(latitude)) {
      return res.status(400).json({
        success: false,
        message: 'lat must be a valid finite number',
      });
    }
    if (!Number.isFinite(longitude)) {
      return res.status(400).json({
        success: false,
        message: 'long must be a valid finite number',
      });
    }
    if (latitude < -90 || latitude > 90) {
      return res.status(400).json({
        success: false,
        message: 'lat must be between -90 and 90',
      });
    }
    if (longitude < -180 || longitude > 180) {
      return res.status(400).json({
        success: false,
        message: 'long must be between -180 and 180',
      });
    }

    // ── Fetch all users & compute distances ─────────────────────────────
    const allUsers = await User.find();

    const matchingUsers = allUsers
      .map((user) => {
        const distance_km = parseFloat(
          calculateDistance(latitude, longitude, user.latitude, user.longitude).toFixed(2)
        );
        return { ...user.toObject(), distance_km };
      })
      // Strictly keep only users whose service radius COVERS the point
      .filter((user) => user.distance_km <= user.service_radius)
      // Sort by distance — closest providers first
      .sort((a, b) => a.distance_km - b.distance_km);

    // Empty array is a valid, non-error response
    return res.status(200).json({ success: true, data: matchingUsers });
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: 'Internal server error' });
  }
};

module.exports = {
  createUser,
  getAllUsers,
  updateUser,
  deleteUser,
  searchUsers,
};
