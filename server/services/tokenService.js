import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'vit_ap_zero_trust_jwt_secret_key_2026_super_secure';
const ACCESS_TOKEN_EXPIRY_MS = 15 * 60 * 1000; // 15 minutes
const REFRESH_TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// Real-time Session Revocation & Token Blocklist Store (In-Memory Redis Proxy)
const sessionBlocklist = new Set();
const activeRefreshTokens = new Map(); // refreshToken -> { uid, deviceFingerprint, expiresAt }

/**
 * Generate SHA-256 Device Fingerprint based on User-Agent and IP
 */
export function generateDeviceFingerprint(req) {
  const userAgent = req.headers['user-agent'] || 'unknown-device';
  const ip = req.ip || req.socket?.remoteAddress || '127.0.0.1';
  return crypto.createHash('sha256').update(`${userAgent}:${ip}`).digest('hex');
}

/**
 * Issue Short-Lived Access Token (15 min) & Rotated Refresh Token (7 days)
 * Bound to Device Fingerprint Signature
 */
export function issueTokenPair(uid, req) {
  const deviceFingerprint = generateDeviceFingerprint(req);
  const now = Date.now();

  const accessTokenPayload = {
    uid,
    deviceFingerprint,
    iat: now,
    exp: now + ACCESS_TOKEN_EXPIRY_MS,
  };

  const accessToken = Buffer.from(JSON.stringify(accessTokenPayload)).toString('base64url') + '.' +
    crypto.createHmac('sha256', JWT_SECRET).update(JSON.stringify(accessTokenPayload)).digest('base64url');

  const refreshToken = crypto.randomBytes(32).toString('hex');
  const refreshExpiresAt = now + REFRESH_TOKEN_EXPIRY_MS;

  // Store refresh token with device binding
  activeRefreshTokens.set(refreshToken, {
    uid,
    deviceFingerprint,
    expiresAt: refreshExpiresAt,
  });

  return {
    accessToken,
    refreshToken,
    expiresIn: 900, // 15 minutes in seconds
  };
}

/**
 * Verify Access Token Signature, Expiry, Revocation Blocklist, and Device Fingerprint Binding
 */
export function verifyAccessToken(token, req) {
  if (!token || sessionBlocklist.has(token)) {
    throw new Error('Token has been revoked or invalidated.');
  }

  const parts = token.split('.');
  if (parts.length !== 2) {
    throw new Error('Malformed token structure.');
  }

  const [payloadB64, signature] = parts;
  const payloadRaw = Buffer.from(payloadB64, 'base64url').toString('utf8');
  const expectedSig = crypto.createHmac('sha256', JWT_SECRET).update(payloadRaw).digest('base64url');

  if (signature !== expectedSig) {
    throw new Error('Invalid token cryptographic signature.');
  }

  const payload = JSON.parse(payloadRaw);

  // Check 15-minute Expiry
  if (Date.now() > payload.exp) {
    throw new Error('Access token has expired. Refresh token required.');
  }

  // Check Device Fingerprint Binding (Reject tokens stolen from another device)
  const currentFingerprint = generateDeviceFingerprint(req);
  if (payload.deviceFingerprint !== currentFingerprint) {
    // Revoke token immediately on suspicious stolen token detection
    sessionBlocklist.add(token);
    throw new Error('Suspicious Activity Detected: Token device fingerprint mismatch. Token revoked.');
  }

  return payload;
}

/**
 * Rotate Refresh Token (Single-Use Refresh Token Rotation)
 */
export function rotateRefreshToken(oldRefreshToken, req) {
  const session = activeRefreshTokens.get(oldRefreshToken);
  if (!session) {
    throw new Error('Invalid or expired refresh token.');
  }

  if (Date.now() > session.expiresAt) {
    activeRefreshTokens.delete(oldRefreshToken);
    throw new Error('Refresh token has expired. Please log in again.');
  }

  // Device Fingerprint validation on refresh
  const currentFingerprint = generateDeviceFingerprint(req);
  if (session.deviceFingerprint !== currentFingerprint) {
    // Invalidate refresh token on device theft attempt
    activeRefreshTokens.delete(oldRefreshToken);
    throw new Error('Device mismatch on refresh token. Session revoked for security.');
  }

  // Single-Use Refresh Token Rotation: Delete old refresh token
  activeRefreshTokens.delete(oldRefreshToken);

  // Issue brand new token pair
  return issueTokenPair(session.uid, req);
}

/**
 * Revoke User Session (On Logout or Suspicious Activity)
 */
export function revokeSession(accessToken, refreshToken) {
  if (accessToken) {
    sessionBlocklist.add(accessToken);
  }
  if (refreshToken) {
    activeRefreshTokens.delete(refreshToken);
  }
}
