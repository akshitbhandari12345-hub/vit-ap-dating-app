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
 * Schedules recurring 24-hour cleanup job
 */
export function scheduleMessageTTLJob() {
  // Run initial cleanup 10 seconds after server boot
  setTimeout(purgeExpiredMessages, 10000);

  // Repeat cleanup every 24 hours (86,400,000 ms)
  setInterval(purgeExpiredMessages, 24 * 60 * 60 * 1000);
}
