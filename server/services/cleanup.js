import { db } from '../config/firebase.js';

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

/**
 * Calculates 1-Year expiration ISO timestamp & millisecond timestamp
 */
export function getMessageExpirationDates() {
  const now = Date.now();
  const expiresAtMs = now + ONE_YEAR_MS;
  const expiresAt = new Date(expiresAtMs).toISOString();
  return { expiresAt, expiresAtMs };
}

/**
 * Checks whether a message object has passed its 1-year expiration period
 */
export function isMessageExpired(messageData) {
  if (!messageData || !messageData.expiresAt) return false;
  const expirationTime = new Date(messageData.expiresAt).getTime();
  return Date.now() >= expirationTime;
}

/**
 * Automated Background Job: Deletes chat messages that are older than 1 year.
 */
export async function purgeExpiredMessages() {
  if (!db) return;

  console.log('[TTL Purge Job] Running automated 1-year chat message expiration cleanup...');
  let deletedCount = 0;

  try {
    const matchesSnap = await db.collection('matches').get();

    for (const matchDoc of matchesSnap.docs) {
      const messagesSnap = await db
        .collection('matches')
        .doc(matchDoc.id)
        .collection('messages')
        .get();

      const batch = db.batch();
      let batchCount = 0;

      for (const msgDoc of messagesSnap.docs) {
        const msgData = msgDoc.data();
        if (isMessageExpired(msgData)) {
          batch.delete(msgDoc.ref);
          deletedCount++;
          batchCount++;
        }
      }

      if (batchCount > 0) {
        await batch.commit();
      }
    }

    console.log(`[TTL Purge Job Completed] Successfully purged ${deletedCount} expired chat message(s).`);
  } catch (error) {
    console.error('[TTL Purge Job Error]:', error.message);
  }
}

/**
 * Automated Background Job: Deletes inactive user accounts after 12 months of no login.
 */
export async function purgeInactiveAccounts() {
  if (!db) return;

  console.log('[Account TTL Purge] Checking for inactive accounts (12 months without login)...');
  const TwelveMonthsAgo = new Date(Date.now() - ONE_YEAR_MS).toISOString();
  let purgedCount = 0;

  try {
    const usersSnap = await db.collection('users').get();
    const docsList = usersSnap.docs || (Array.isArray(usersSnap) ? usersSnap : []);

    for (const docSnap of docsList) {
      const userData = typeof docSnap.data === 'function' ? docSnap.data() : docSnap;
      const lastActive = userData.lastLoginAt || userData.updatedAt || userData.createdAt;

      if (lastActive && lastActive < TwelveMonthsAgo) {
        const uid = userData.uid || docSnap.id;
        console.log(`[Account TTL Purge] Deleting inactive user: ${uid} (Inactive since ${lastActive})`);
        
        // 1. Delete user matches and chat history
        const matchesQuery = await db.collection('matches').get();
        for (const matchDoc of matchesQuery.docs || []) {
          const matchData = typeof matchDoc.data === 'function' ? matchDoc.data() : matchDoc;
          if (matchData.users && matchData.users.includes(uid)) {
            await db.collection('matches').doc(matchDoc.id).delete();
          }
        }

        // 2. Delete user profile document
        await db.collection('users').doc(uid).delete();
        purgedCount++;
      }
    }

    console.log(`[Account TTL Purge Completed] Purged ${purgedCount} inactive user account(s).`);
  } catch (err) {
    console.error('[Account TTL Purge Error]:', err.message);
  }
}

/**
 * Schedules recurring 24-hour cleanup jobs
 */
export function scheduleMessageTTLJob() {
  // Run initial cleanups 10 seconds after server boot
  setTimeout(() => {
    purgeExpiredMessages();
    purgeInactiveAccounts();
  }, 10000);

  // Repeat cleanups every 24 hours (86,400,000 ms)
  setInterval(() => {
    purgeExpiredMessages();
    purgeInactiveAccounts();
  }, 24 * 60 * 60 * 1000);
}
