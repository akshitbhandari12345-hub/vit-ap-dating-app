import express from 'express';
import { db } from '../config/firebase.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.use(requireAuth);

/**
 * POST /api/swipe
 * Processes a left or right swipe securely on backend server.
 * Evaluates match logic server-side to prevent match tampering.
 */
router.post('/', async (req, res) => {
  try {
    const { targetUserId, direction } = req.body;
    const currentUid = req.user.uid;

    if (!targetUserId || !direction) {
      return res.status(400).json({ error: 'Missing targetUserId or direction' });
    }

    const liked = direction === 'right';

    // Save swipe record in private database
    await db.collection('swipes').doc(currentUid).collection('swipedOn').doc(targetUserId).set({
      liked,
      timestamp: new Date().toISOString(),
    });

    let isMatch = false;
    let matchProfile = null;

    if (liked) {
      // Check if target user liked current user (Server-side Match Evaluation)
      const targetSwipeDoc = await db
        .collection('swipes')
        .doc(targetUserId)
        .collection('swipedOn')
        .doc(currentUid)
        .get();

      if (targetSwipeDoc.exists && targetSwipeDoc.data()?.liked === true) {
        isMatch = true;

        // Create match entry
        const matchRef = await db.collection('matches').add({
          users: [currentUid, targetUserId],
          createdAt: new Date().toISOString(),
        });

        // Fetch target user's profile for match notification
        const targetProfileDoc = await db.collection('users').doc(targetUserId).get();
        if (targetProfileDoc.exists) {
          matchProfile = {
            id: targetProfileDoc.id,
            matchId: matchRef.id,
            ...targetProfileDoc.data(),
          };
        }
      }
    }

    return res.json({
      success: true,
      liked,
      isMatch,
      matchProfile,
    });
  } catch (error) {
    console.error('[Swipe Gateway Error]:', error);
    return res.status(500).json({ error: 'Failed to process swipe action', details: error.message });
  }
});

export default router;
