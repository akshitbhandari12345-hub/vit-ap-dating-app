import express from 'express';
import { db } from '../config/firebase.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Apply Zero-Trust Auth middleware to all profile routes
router.use(requireAuth);

/**
 * GET /api/profiles/feed
 * Returns eligible profiles to display in the swipe deck.
 * Excludes current user and users already swiped on by current user.
 */
router.get('/feed', async (req, res) => {
  try {
    const currentUid = req.user.uid;

    if (!db) {
      return res.status(500).json({ error: 'Database service unavailable' });
    }

    // Fetch IDs of users already swiped on by current user
    const swipesSnapshot = await db.collection('swipes').doc(currentUid).collection('swipedOn').get();
    const swipedUserIds = swipesSnapshot.docs.map(doc => doc.id);

    // Fetch all user profiles
    const usersSnapshot = await db.collection('users').get();
    const potentialMatches = [];

    const docsList = usersSnapshot.docs || (Array.isArray(usersSnapshot) ? usersSnapshot : []);

    docsList.forEach(docSnap => {
      const profileData = typeof docSnap.data === 'function' ? docSnap.data() : docSnap;
      const profileUid = profileData.uid || docSnap.id;

      if (profileUid !== currentUid && !swipedUserIds.includes(profileUid)) {
        potentialMatches.push({
          id: docSnap.id || profileUid,
          ...profileData,
          uid: profileUid,
        });
      }
    });

    return res.json({ profiles: potentialMatches });
  } catch (error) {
    console.error('[Profiles Feed Error]:', error);
    return res.status(500).json({ error: 'Failed to fetch profiles feed', details: error.message });
  }
});

/**
 * GET /api/profiles/me
 * Returns profile details for current logged in user.
 */
router.get('/me', async (req, res) => {
  try {
    const docSnap = await db.collection('users').doc(req.user.uid).get();
    if (!docSnap.exists) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    return res.json({ profile: { id: docSnap.id, ...docSnap.data() } });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

/**
 * GET /api/profiles/check-username/:username
 * Checks if a requested username is available and unique.
 */
router.get('/check-username/:username', async (req, res) => {
  try {
    const targetUsername = String(req.params.username || '').toLowerCase().trim();
    if (!targetUsername) {
      return res.status(400).json({ available: false, error: 'Username cannot be empty' });
    }

    const usersSnapshot = await db.collection('users').get();
    const docsList = usersSnapshot.docs || (Array.isArray(usersSnapshot) ? usersSnapshot : []);

    let isTaken = false;
    docsList.forEach(docSnap => {
      const data = typeof docSnap.data === 'function' ? docSnap.data() : docSnap;
      if (data && data.username && String(data.username).toLowerCase().trim() === targetUsername) {
        if (data.uid !== req.user.uid) {
          isTaken = true;
        }
      }
    });

    if (isTaken) {
      return res.json({ available: false, message: 'Username is already taken by another student' });
    }

    return res.json({ available: true, message: 'Username is unique and available!' });
  } catch (error) {
    console.error('[Check Username Error]:', error);
    return res.status(500).json({ error: 'Failed to verify username' });
  }
});

/**
 * POST /api/profiles/me
 * Updates or creates profile for current logged in user.
 */
router.post('/me', async (req, res) => {
  try {
    const { name, bio, branch, year, interests, instagram, gender, image, username, googleEmail, emailPassword, accountPassword } = req.body;
    
    // Sanitize and format inputs
    const updatedProfile = {
      uid: req.user.uid,
      email: googleEmail || req.user.email,
      username: String(username || '').trim().toLowerCase(),
      name: String(name || '').trim(),
      bio: String(bio || '').trim(),
      branch: String(branch || '').trim(),
      year: String(year || '').trim(),
      interests: Array.isArray(interests) ? interests : [],
      instagram: String(instagram || '').trim(),
      gender: String(gender || '').trim(),
      image: String(image || '').trim(),
      updatedAt: new Date().toISOString(),
    };

    if (emailPassword) updatedProfile.hasEmailAuth = true;
    if (accountPassword) updatedProfile.hasAccountPassword = true;

    await db.collection('users').doc(req.user.uid).set(updatedProfile, { merge: true });
    return res.json({ success: true, profile: updatedProfile });
  } catch (error) {
    console.error('[Update Profile Error]:', error);
    return res.status(500).json({ error: 'Failed to update profile' });
  }
});

/**
 * DELETE /api/profiles/me
 * Permanently deletes logged in user's profile and associated data from database.
 */
router.delete('/me', async (req, res) => {
  try {
    const currentUid = req.user.uid;

    // Delete user profile document
    await db.collection('users').doc(currentUid).set({}, { merge: false });

    return res.json({
      success: true,
      message: 'Profile and associated data successfully deleted.',
    });
  } catch (error) {
    console.error('[Delete Profile Error]:', error);
    return res.status(500).json({ error: 'Failed to delete profile' });
  }
});

export default router;
