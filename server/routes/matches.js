import express from 'express';
import { db } from '../config/firebase.js';
import { requireAuth } from '../middleware/auth.js';
import { encryptAtRest, decryptAtRest } from '../services/encryption.js';
import { getMessageExpirationDates, isMessageExpired } from '../services/cleanup.js';

const router = express.Router();

router.use(requireAuth);

/**
 * GET /api/matches
 * Returns all active matches for the authenticated user.
 */
router.get('/', async (req, res) => {
  try {
    const currentUid = req.user.uid;

    const matchesQuery = await db
      .collection('matches')
      .where('users', 'array-contains', currentUid)
      .get();

    const matchesList = [];

    for (const docSnap of matchesQuery.docs) {
      const matchData = docSnap.data();
      const otherUserId = matchData.users.find(id => id !== currentUid);

      if (otherUserId) {
        const otherUserDoc = await db.collection('users').doc(otherUserId).get();
        if (otherUserDoc.exists) {
          matchesList.push({
            id: docSnap.id,
            matchId: docSnap.id,
            createdAt: matchData.createdAt,
            profile: {
              id: otherUserDoc.id,
              ...otherUserDoc.data(),
            },
          });
        }
      }
    }

    return res.json({ matches: matchesList });
  } catch (error) {
    console.error('[Matches Gateway Error]:', error);
    return res.status(500).json({ error: 'Failed to fetch matches' });
  }
});

/**
 * GET /api/matches/:matchId/messages
 * Fetches chat message history for authorized match.
 * Decrypts server-side AES-256-GCM encryption at rest and filters out messages older than 1 year.
 */
router.get('/:matchId/messages', async (req, res) => {
  try {
    const { matchId } = req.params;
    const currentUid = req.user.uid;

    // Verify user belongs to this match (Zero-Trust Authorization check)
    const matchDoc = await db.collection('matches').doc(matchId).get();
    if (!matchDoc.exists) {
      return res.status(404).json({ error: 'Match not found' });
    }

    const matchData = matchDoc.data();
    if (!matchData.users.includes(currentUid)) {
      return res.status(403).json({ error: 'Forbidden: You are not a participant in this chat' });
    }

    const messagesSnap = await db
      .collection('matches')
      .doc(matchId)
      .collection('messages')
      .orderBy('timestamp', 'asc')
      .get();

    const activeMessages = [];

    for (const doc of messagesSnap.docs) {
      const data = doc.data();

      // Enforce 1-Year Message Auto Expiration
      if (isMessageExpired(data)) {
        continue; // Omit expired messages (> 1 year old)
      }

      // Decrypt server-side encryption at rest
      const decryptedText = data.encryptedPayload ? decryptAtRest(data.encryptedPayload) : (data.text || '');

      activeMessages.push({
        id: doc.id,
        senderId: data.senderId,
        timestamp: data.timestamp,
        expiresAt: data.expiresAt,
        text: decryptedText,
      });
    }

    return res.json({ messages: activeMessages });
  } catch (error) {
    console.error('[Get Messages Error]:', error);
    return res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

/**
 * POST /api/matches/:matchId/messages
 * Appends a new chat message to the match thread.
 * Encrypts content at rest with AES-256-GCM and computes 1-Year Expiration TTL.
 */
router.post('/:matchId/messages', async (req, res) => {
  try {
    const { matchId } = req.params;
    const { text } = req.body;
    const currentUid = req.user.uid;

    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'Message text cannot be empty' });
    }

    // Verify user belongs to this match
    const matchDoc = await db.collection('matches').doc(matchId).get();
    if (!matchDoc.exists) {
      return res.status(404).json({ error: 'Match not found' });
    }

    const matchData = matchDoc.data();
    if (!matchData.users.includes(currentUid)) {
      return res.status(403).json({ error: 'Forbidden: You are not a participant in this chat' });
    }

    const rawText = text.trim();
    // Encrypt at rest using separate server vault key
    const encryptedPayload = encryptAtRest(rawText);

    // Compute 1-Year Message Auto-Expiration Timestamps
    const { expiresAt, expiresAtMs } = getMessageExpirationDates();

    const newMessageRecord = {
      senderId: currentUid,
      timestamp: new Date().toISOString(),
      expiresAt,
      expiresAtMs,
      encryptedPayload, // Stores ciphertext, iv, authTag at rest (Zero plaintext in DB)
    };

    const msgRef = await db
      .collection('matches')
      .doc(matchId)
      .collection('messages')
      .add(newMessageRecord);

    return res.json({
      success: true,
      message: {
        id: msgRef.id,
        senderId: currentUid,
        timestamp: newMessageRecord.timestamp,
        expiresAt,
        text: rawText,
      },
    });
  } catch (error) {
    console.error('[Send Message Error]:', error);
    return res.status(500).json({ error: 'Failed to send message' });
  }
});

export default router;
