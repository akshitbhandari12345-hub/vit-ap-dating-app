/**
 * Dating Security Module: Location Privacy & Geohashing
 * Enforces ~1.1km precision rounding (Geofuzzing) to prevent precise tracking & stalking risks.
 */

/**
 * Fuzz coordinates to ~1.1km precision before saving or transmitting over network
 */
export function fuzzLocation(lat, lng) {
  if (lat === undefined || lng === undefined || lat === null || lng === null) {
    return { lat: 16.5062, lng: 80.5185 }; // Default VIT AP Campus Coordinates (Fuzzed)
  }
  return {
    lat: Math.round(Number(lat) * 100) / 100,
    lng: Math.round(Number(lng) * 100) / 100,
  };
}

/**
 * Calculate distance in km between fuzzed coordinates (Haversine formula)
 */
export function calculateFuzzedDistance(lat1, lng1, lat2, lng2) {
  const p1 = fuzzLocation(lat1, lng1);
  const p2 = fuzzLocation(lat2, lng2);

  const R = 6371; // Earth radius in km
  const dLat = ((p2.lat - p1.lat) * Math.PI) / 180;
  const dLng = ((p2.lng - p1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((p1.lat * Math.PI) / 180) *
      Math.cos((p2.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.max(1, Math.round(distance)); // Minimum 1km radius fuzzing display
}
