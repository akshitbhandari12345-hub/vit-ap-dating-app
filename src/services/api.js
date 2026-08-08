import { auth } from '../firebase';
import { useStore } from '../store';

const API_BASE_URL = 'http://localhost:5000/api';

/**
 * Helper to obtain Firebase ID Token for Zero-Trust Bearer Authorization
 */
async function getAuthHeader() {
  const user = auth.currentUser;
  let token = '';
  if (user) {
    try {
      token = await user.getIdToken();
    } catch (e) {
      console.warn('Failed to retrieve Firebase ID token:', e);
    }
  }

  const headers = {
    'Content-Type': 'application/json',
  };

  const storeUid = useStore.getState().user?.uid || 'student123';

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
    headers['x-dev-user-id'] = user?.uid || storeUid;
  } else {
    // Development fallback header if token retrieval is bypassed in dev mode
    headers['x-dev-user-id'] = user?.uid || storeUid;
    headers['Authorization'] = `Bearer dev-${user?.uid || storeUid}`;
  }

  return headers;
}

export const api = {
  /**
   * Login user via Username (or Email) and Password
   */
  async login(usernameOrEmail, password) {
    const res = await fetch(`${API_BASE_URL}/profiles/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usernameOrEmail, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    return data;
  },
  /**
   * Check if username is available and unique
   */
  async checkUsername(username) {
    const headers = await getAuthHeader();
    const res = await fetch(`${API_BASE_URL}/profiles/check-username/${encodeURIComponent(username)}`, { headers });
    if (!res.ok) return { available: false, message: 'Failed to verify username' };
    return await res.json();
  },
  /**
   * Delete logged in user profile permanently
   */
  async deleteProfile() {
    const headers = await getAuthHeader();
    const res = await fetch(`${API_BASE_URL}/profiles/me`, {
      method: 'DELETE',
      headers,
    });
    if (!res.ok) throw new Error('Failed to delete profile');
    return await res.json();
  },
  /**
   * Fetch details of currently logged in user profile
   */
  async getMyProfile() {
    const headers = await getAuthHeader();
    const res = await fetch(`${API_BASE_URL}/profiles/me`, { headers });
    if (!res.ok) return null;
    const data = await res.json();
    return data.profile || null;
  },

  /**
   * Fetch potential profiles for swipe deck
   */
  async getProfilesFeed() {
    const headers = await getAuthHeader();
    const res = await fetch(`${API_BASE_URL}/profiles/feed`, { headers });
    if (!res.ok) throw new Error('Failed to fetch profile feed from API gateway');
    const data = await res.json();
    return data.profiles || [];
  },

  /**
   * Post swipe decision (left or right)
   */
  async swipe(targetUserId, direction) {
    const headers = await getAuthHeader();
    const res = await fetch(`${API_BASE_URL}/swipe`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ targetUserId, direction }),
    });
    if (!res.ok) throw new Error('Failed to record swipe action');
    return await res.json();
  },

  /**
   * Fetch active matches
   */
  async getMatches() {
    const headers = await getAuthHeader();
    const res = await fetch(`${API_BASE_URL}/matches`, { headers });
    if (!res.ok) throw new Error('Failed to fetch matches');
    const data = await res.json();
    return data.matches || [];
  },

  /**
   * Fetch chat messages for a match
   */
  async getMessages(matchId) {
    const headers = await getAuthHeader();
    const res = await fetch(`${API_BASE_URL}/matches/${matchId}/messages`, { headers });
    if (!res.ok) throw new Error('Failed to fetch messages');
    const data = await res.json();
    return data.messages || [];
  },

  /**
   * Send a chat message
   */
  async sendMessage(matchId, text) {
    const headers = await getAuthHeader();
    const res = await fetch(`${API_BASE_URL}/matches/${matchId}/messages`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ text }),
    });
    if (!res.ok) throw new Error('Failed to send message');
    return await res.json();
  },

  /**
   * Send Rate-Limited Typing Indicator Presence Event
   */
  async sendTypingIndicator(matchId) {
    const headers = await getAuthHeader();
    const res = await fetch(`${API_BASE_URL}/matches/${matchId}/typing`, {
      method: 'POST',
      headers,
    });
    if (!res.ok) return null;
    return await res.json();
  },

  /**
   * Call Private Subnet AI Microservice for compatibility & icebreakers
   */
  async getAICompatibility(targetUserId) {
    const headers = await getAuthHeader();
    const res = await fetch(`${API_BASE_URL}/ai/compatibility`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ targetUserId }),
    });
    if (!res.ok) throw new Error('AI service call failed');
    return await res.json();
  },

  /**
   * Save profile updates
   */
  async updateProfile(profileData) {
    const headers = await getAuthHeader();
    const res = await fetch(`${API_BASE_URL}/profiles/me`, {
      method: 'POST',
      headers,
      body: JSON.stringify(profileData),
    });
    if (!res.ok) throw new Error('Failed to update profile');
    return await res.json();
  },
};
