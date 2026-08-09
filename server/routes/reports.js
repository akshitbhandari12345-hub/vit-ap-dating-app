import express from 'express';
import { db } from '../config/firebase.js';
import { requireAuth } from '../middleware/auth.js';
import { logSecurityEvent } from '../services/securityAudit.js';

const router = express.Router();
router.use(requireAuth);

// In-Memory Shadowban Store & Human Review Queue Store
const shadowbannedUsers = new Set();
const reportsQueue = []; // Array of privacy-preserving report objects

/**
 * Check if a user UID is shadowbanned
 */
export function isUserShadowbanned(uid) {
  return shadowbannedUsers.has(uid);
}

/**
 * POST /api/reports
 * Submit a privacy-preserving abuse report.
 * Captures message CONTEXT metadata (timestamps, frequency, match ID) — NOT message content!
 */
router.post('/', async (req, res) => {
  try {
    const { targetUserId, matchId, reason, details } = req.body;
    const reporterUid = req.user.uid;

    if (!targetUserId || !reason) {
      return res.status(400).json({ error: 'Target user ID and reason are required.' });
    }

    // Capture privacy-preserving metadata context (No message text saved)
    const reportRecord = {
      id: `rep_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      reporterUid,
      targetUserId,
      matchId: matchId || null,
      reason: String(reason).trim(),
      details: details ? String(details).trim() : '',
      timestamp: new Date().toISOString(),
      status: 'PENDING_HUMAN_REVIEW',
      contextData: {
        deviceFingerprint: req.user.deviceFingerprint || 'unknown',
        ip: req.ip || req.socket?.remoteAddress || '127.0.0.1',
      },
    };

    reportsQueue.push(reportRecord);

    logSecurityEvent('USER_REPORT_SUBMITTED', {
      reporterUid,
      targetUserId,
      reason,
      matchId,
    });

    return res.json({
      success: true,
      message: 'Report submitted successfully. Sent to Human Review Queue.',
      reportId: reportRecord.id,
    });
  } catch (error) {
    console.error('[Submit Report Error]:', error);
    return res.status(500).json({ error: 'Failed to submit report' });
  }
});

/**
 * GET /api/reports/queue
 * Fetches pending human review queue items (Privacy-Preserving Context).
 */
router.get('/queue', async (req, res) => {
  try {
    return res.json({
      success: true,
      pendingCount: reportsQueue.length,
      queue: reportsQueue,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch review queue' });
  }
});

/**
 * POST /api/reports/shadowban/:targetUid
 * Shadowbans a suspected scammer. Messages appear sent to scammer, but are silently omitted from recipient feeds.
 */
router.post('/shadowban/:targetUid', async (req, res) => {
  try {
    const { targetUid } = req.params;
    const { enable } = req.body;

    if (enable !== false) {
      shadowbannedUsers.add(targetUid);
      logSecurityEvent('USER_SHADOWBANNED', { targetUid, action: 'SILENT_MESSAGE_DISCARD_ENABLED' });
    } else {
      shadowbannedUsers.delete(targetUid);
      logSecurityEvent('USER_UNSHADOWBANNED', { targetUid });
    }

    return res.json({
      success: true,
      shadowbanned: shadowbannedUsers.has(targetUid),
      targetUid,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update shadowban status' });
  }
});

export default router;
