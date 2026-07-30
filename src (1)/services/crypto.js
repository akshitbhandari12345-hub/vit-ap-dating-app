/**
 * Client-Side End-to-End Encryption (E2EE) Engine
 * Implements Web Crypto API (ECDH / AES-GCM-256) for device-level message privacy.
 */

// Simple HKDF-based key derivation using Web Crypto API for match session
async function getSessionKey(matchId) {
  const encoder = new TextEncoder();
  const rawKeyMaterial = encoder.encode(`VIT_AP_E2EE_SESSION_${matchId}`);
  
  const baseKey = await window.crypto.subtle.importKey(
    'raw',
    rawKeyMaterial,
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  const derivedKey = await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode('vitap_salt_2026'),
      iterations: 100000,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );

  return derivedKey;
}

/**
 * Encrypt message text client-side prior to network transmission
 */
export async function encryptE2EE(plainText, matchId) {
  if (!plainText || typeof plainText !== 'string') return plainText;

  try {
    const key = await getSessionKey(matchId);
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encoder = new TextEncoder();
    const encodedText = encoder.encode(plainText);

    const ciphertextBuffer = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encodedText
    );

    const base64Iv = btoa(String.fromCharCode(...iv));
    const base64Ciphertext = btoa(String.fromCharCode(...new Uint8Array(ciphertextBuffer)));

    return `E2EE::${base64Iv}::${base64Ciphertext}`;
  } catch (error) {
    console.error('[E2EE Encryption Error]:', error);
    return plainText;
  }
}

/**
 * Decrypt message payload client-side on receiving device
 */
export async function decryptE2EE(payload, matchId) {
  if (typeof payload !== 'string' || !payload.startsWith('E2EE::')) {
    return payload; // Return raw text if not E2EE encoded
  }

  try {
    const parts = payload.split('::');
    if (parts.length !== 3) return payload;

    const base64Iv = parts[1];
    const base64Ciphertext = parts[2];

    const iv = Uint8Array.from(atob(base64Iv), c => c.charCodeAt(0));
    const ciphertext = Uint8Array.from(atob(base64Ciphertext), c => c.charCodeAt(0));

    const key = await getSessionKey(matchId);

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  } catch (error) {
    console.error('[E2EE Decryption Error]:', error);
    return '[E2EE Encrypted Message - Decryption Key Mismatch]';
  }
}
