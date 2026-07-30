import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

let rawDb = null;
let auth = null;
let useMemoryStore = false;

// In-Memory Database Store for Local Dev Testing when Firebase Admin Key is not set
const memoryStore = {
  users: new Map(),
  swipes: new Map(), // key: ${uid}_${targetId}
  matches: new Map(), // key: matchId
  messages: new Map(), // key: matchId -> Array
};

// Seed sample campus profiles for swipe deck testing in local dev mode
memoryStore.users.set('student1', {
  uid: 'student1',
  name: 'Ananya Sharma',
  branch: 'CSE',
  year: '3rd',
  bio: 'Coding enthusiast & AI researcher at VIT AP. Coffee lover ☕',
  interests: ['Coding', 'Music', 'Cafes'],
  image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
});
memoryStore.users.set('student2', {
  uid: 'student2',
  name: 'Rohan Verma',
  branch: 'ECE',
  year: '4th',
  bio: 'Robotics project lead. Looking for someone to chat about tech & movies 🎬',
  interests: ['Robotics', 'Movies', 'Gaming'],
  image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
});

try {
  if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID || 'vit-ap-match',
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
    });
    rawDb = admin.firestore();
    auth = admin.auth();
    console.log('[Zero-Trust DB] Connected to Firestore via Firebase Admin SDK.');
  } else {
    useMemoryStore = true;
    console.log('[Zero-Trust DB] Running in Local Memory Proxy Mode (Set FIREBASE_PRIVATE_KEY in .env for production Firestore).');
  }
} catch (error) {
  useMemoryStore = true;
  console.warn('[Zero-Trust DB Warning] Falling back to Memory DB:', error.message);
}

// Unified Firestore DB Proxy Interface
export const db = {
  collection(colName) {
    if (!useMemoryStore && rawDb) {
      try {
        return rawDb.collection(colName);
      } catch (e) {
        useMemoryStore = true;
      }
    }

    // In-Memory Collection Proxy
    return {
      doc(docId) {
        return {
          async get() {
            if (colName === 'users') {
              const data = memoryStore.users.get(docId);
              return { exists: !!data, id: docId, data: () => data };
            }
            if (colName === 'matches') {
              const data = memoryStore.matches.get(docId);
              return { exists: !!data, id: docId, data: () => data };
            }
            return { exists: false, id: docId, data: () => null };
          },
          async set(data, options = {}) {
            if (colName === 'users') {
              const existing = memoryStore.users.get(docId) || {};
              const updated = options.merge ? { ...existing, ...data } : data;
              memoryStore.users.set(docId, updated);
            }
            return { id: docId };
          },
          collection(subColName) {
            return {
              doc(subDocId) {
                return {
                  async get() {
                    const key = `${docId}_${subDocId}`;
                    const data = memoryStore.swipes.get(key);
                    return { exists: !!data, id: subDocId, data: () => data };
                  },
                  async set(data) {
                    const key = `${docId}_${subDocId}`;
                    memoryStore.swipes.set(key, data);
                    return { id: subDocId };
                  },
                };
              },
              async get() {
                if (subColName === 'swipedOn') {
                  const docs = [];
                  for (const [key, value] of memoryStore.swipes.entries()) {
                    if (key.startsWith(`${docId}_`)) {
                      const targetId = key.replace(`${docId}_`, '');
                      docs.push({ id: targetId, data: () => value });
                    }
                  }
                  return { docs };
                }
                if (subColName === 'messages') {
                  const msgs = memoryStore.messages.get(docId) || [];
                  const docs = msgs.map((m, idx) => ({ id: `msg_${idx}`, data: () => m }));
                  return { docs };
                }
                return { docs: [] };
              },
              async add(data) {
                if (subColName === 'messages') {
                  const msgs = memoryStore.messages.get(docId) || [];
                  msgs.push(data);
                  memoryStore.messages.set(docId, msgs);
                  return { id: `msg_${msgs.length}` };
                }
                return { id: `doc_${Date.now()}` };
              },
              orderBy() {
                return this;
              },
            };
          },
        };
      },
      async get() {
        if (colName === 'users') {
          const docs = Array.from(memoryStore.users.entries()).map(([id, data]) => ({
            id,
            data: () => data,
          }));
          return { docs };
        }
        if (colName === 'matches') {
          const docs = Array.from(memoryStore.matches.entries()).map(([id, data]) => ({
            id,
            data: () => data,
          }));
          return { docs };
        }
        return { docs: [] };
      },
      async add(data) {
        const id = `match_${Date.now()}`;
        if (colName === 'matches') {
          memoryStore.matches.set(id, data);
        }
        return { id };
      },
      where(field, op, val) {
        return {
          async get() {
            if (colName === 'matches' && field === 'users' && op === 'array-contains') {
              const docs = [];
              for (const [id, data] of memoryStore.matches.entries()) {
                if (Array.isArray(data.users) && data.users.includes(val)) {
                  docs.push({ id, data: () => data });
                }
              }
              return { docs };
            }
            return { docs: [] };
          },
        };
      },
    };
  },
  batch() {
    return {
      delete() {},
      async commit() {},
    };
  },
};

export { admin, auth };
