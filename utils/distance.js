/**
 * distance.js — Haversine Formula Utility
 *
 * Calculates the great-circle distance (in kilometres) between two points
 * on the Earth's surface given their latitude and longitude in degrees.
 *
 * The Haversine formula is particularly well-suited for computing distances
 * on a sphere and avoids floating-point issues that plague the simpler
 * law-of-cosines approach at small distances.
 *
 * Formula:
 *   a = sin²(Δlat/2) + cos(lat₁) · cos(lat₂) · sin²(Δlon/2)
 *   c = 2 · atan2(√a, √(1−a))
 *   d = R · c
 *
 * Where R = 6 371 km (Earth's mean radius).
 *
 * Reference: https://en.wikipedia.org/wiki/Haversine_formula
 *
 * Verification example (Delhi → Mumbai):
 *   calculateDistance(28.6139, 77.2090, 19.0760, 72.8777) ≈ 1 153 km
 */

// ─── Helper ─────────────────────────────────────────────────────────────────

/**
 * Convert degrees to radians.
 * @param {number} degrees
 * @returns {number} radians
 */
const toRadians = (degrees) => (degrees * Math.PI) / 180;

// ─── Main Function ──────────────────────────────────────────────────────────

/**
 * Calculate the distance between two geographic coordinates using the
 * Haversine formula.
 *
 * @param {number} lat1 - Latitude  of point 1 (in degrees, −90 to 90)
 * @param {number} lon1 - Longitude of point 1 (in degrees, −180 to 180)
 * @param {number} lat2 - Latitude  of point 2 (in degrees, −90 to 90)
 * @param {number} lon2 - Longitude of point 2 (in degrees, −180 to 180)
 * @returns {number} Distance in kilometres (always ≥ 0)
 * @throws {Error} If any argument is not a finite number
 */
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  // ── Guard: all inputs must be finite numbers ──────────────────────────
  const args = { lat1, lon1, lat2, lon2 };
  for (const [name, value] of Object.entries(args)) {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new Error(`${name} must be a finite number, received: ${value}`);
    }
  }

  const EARTH_RADIUS_KM = 6371; // Mean radius of the Earth in km

  // Step 1 — Compute differences in radians
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  // Step 2 — Apply the Haversine formula
  //   a  = sin²(Δlat/2) + cos(lat₁) · cos(lat₂) · sin²(Δlon/2)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) ** 2;

  // Clamp `a` to [0, 1] to prevent NaN from floating-point rounding
  const aClamped = Math.min(Math.max(a, 0), 1);

  // Step 3 — Central angle in radians
  //   c = 2 · atan2(√a, √(1−a))
  const c = 2 * Math.atan2(Math.sqrt(aClamped), Math.sqrt(1 - aClamped));

  // Step 4 — Arc length = radius × central angle
  return EARTH_RADIUS_KM * c;
};

module.exports = { calculateDistance };
