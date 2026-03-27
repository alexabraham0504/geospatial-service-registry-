/**
 * User.js — Mongoose Model
 *
 * Defines the schema for a service-provider user who has a geographic
 * location (latitude / longitude) and a service_radius (in km).
 *
 * Validation rules enforced at the schema level:
 *  - name:           required, trimmed, max 100 characters
 *  - latitude:       required, number between −90 and 90
 *  - longitude:      required, number between −180 and 180
 *  - service_radius: required, positive number (> 0)
 */

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    // Display name of the service provider
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name must be at most 100 characters'],
    },

    // Geographic latitude (−90 to 90)
    latitude: {
      type: Number,
      required: [true, 'Latitude is required'],
      min: [-90, 'Latitude must be at least -90'],
      max: [90, 'Latitude must be at most 90'],
    },

    // Geographic longitude (−180 to 180)
    longitude: {
      type: Number,
      required: [true, 'Longitude is required'],
      min: [-180, 'Longitude must be at least -180'],
      max: [180, 'Longitude must be at most 180'],
    },

    // Radius (in km) within which the user provides services
    // Must be strictly positive; we use a custom validator instead of
    // min: 0.01 to catch exactly-zero values with a clear message.
    service_radius: {
      type: Number,
      required: [true, 'Service radius is required'],
      validate: {
        validator: (v) => typeof v === 'number' && Number.isFinite(v) && v > 0,
        message: 'Service radius must be a positive number greater than 0',
      },
    },
  },
  {
    // Automatically add createdAt and updatedAt fields
    timestamps: true,
  }
);

module.exports = mongoose.model('User', userSchema);
