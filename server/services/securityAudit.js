import crypto from 'crypto';

/**
 * Security Audit & Anomaly Detection Engine
 * 1. Safe Audit Logging (NO PII, NO Message Content, NO Encryption Keys).
 * 2. Canary Token Honeypot Detection.
 * 3. Anomaly Detection (Spike rate limiting, Impossible Travel detection).
 */

const CANARY_TOKENS = new Set(['CANARY_API_KEY_VITAP_SECRET_9999', 'canary_user_honeypot_888']);
const userActivityBaselines = new Map(); // uid -> { messageCount, windowStart, lastIp, lastTimestamp }

/**
 * Safe Security Audit Logger
 * Strictly filters out PII, passwords, chat message text, and vault keys.
 */
export function logSecurityEvent(eventType, metadata = {}) {
  const safeMetadata = { ...metadata };

  // Sanitize and redact forbidden fields
  delete safeMetadata.password;
  delete safeMetadata.emailPassword;
  delete safeMetadata.accountPassword;
  delete safeMetadata.text;
  delete safeMetadata.messageContent;
  delete safeMetadata.encryptedPayload;
  delete safeMetadata.key;

  const timestamp = new Date().toISOString();
  console.log(`[SECURITY AUDIT LOG][${timestamp}][${eventType}]`, JSON.stringify(safeMetadata));
}

/**
 * Canary Honeypot Check: Detects unauthorized access to trap endpoints/tokens.
 */
export function checkCanaryTrap(req) {
  const canaryHeader = req.headers['x-canary-key'] || req.headers['x-api-key'];
  const devUserHeader = req.headers['x-dev-user-id'];

  if (CANARY_TOKENS.has(canaryHeader) || CANARY_TOKENS.has(devUserHeader)) {
    logSecurityEvent('CANARY_TRAP_TRIGGERED', {
      ip: req.ip || req.socket?.remoteAddress,
      userAgent: req.headers['user-agent'],
      triggeredKey: canaryHeader || devUserHeader,
      action: 'CRITICAL_ALERT_SESSION_BLOCKED',
    });
    return true; // Honeypot trap triggered
  }
  return false;
}

/**
 * Anomaly Detection: Checks for Impossible Travel and Message Volume Spikes.
 */
export function validateUserActivityAnomaly(uid, req, actionType = 'GENERAL_REQUEST') {
  const now = Date.now();
  const clientIp = req.ip || req.socket?.remoteAddress || '127.0.0.1';

  let record = userActivityBaselines.get(uid);
  if (!record) {
    record = {
      messageCount: 0,
      windowStart: now,
      lastIp: clientIp,
      lastTimestamp: now,
    };
    userActivityBaselines.set(uid, record);
  }

  // 1. Impossible Travel Detection (Short time gap between different IP locations)
  if (record.lastIp !== clientIp) {
    const timeDeltaMs = now - record.lastTimestamp;
    // If IP changed in less than 2 minutes
    if (timeDeltaMs < 2 * 60 * 1000) {
      logSecurityEvent('IMPOSSIBLE_TRAVEL_SUSPICION', {
        uid,
        previousIp: record.lastIp,
        currentIp: clientIp,
        timeDeltaMs,
        actionTaken: 'SESSION_TERMINATION_REQUIRED',
      });
      throw new Error('Impossible Travel Detected: Session killed due to geographical IP anomaly.');
    }
  }

  // Update tracking
  record.lastIp = clientIp;
  record.lastTimestamp = now;

  // 2. Rate & Volume Anomaly Detection for Chat / Export Actions
  if (actionType === 'SEND_MESSAGE') {
    // Reset 1-minute tracking window
    if (now - record.windowStart > 60 * 1000) {
      record.messageCount = 0;
      record.windowStart = now;
    }

    record.messageCount++;

    // Baseline: Max 40 messages per minute per user
    if (record.messageCount > 40) {
      logSecurityEvent('UNUSUALLY_HIGH_MESSAGE_SPIKE', {
        uid,
        count: record.messageCount,
        windowSec: 60,
        actionTaken: 'THROTTLED',
      });
      throw new Error('Anomaly Throttling: Message volume spike detected. Re-authentication required.');
    }
  }
}
