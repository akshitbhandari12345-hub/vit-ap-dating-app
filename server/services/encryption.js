import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

// Dedicated Server-Side Encryption Key for Data at Rest (Separate from DB Credentials)
const SECRET = process.env.CHAT_ENCRYPTION_SECRET || 'vit-ap-default-256bit-chat-secret-key-at-rest-2026';
const ALGORITHM = 'aes-256-gcm';

// Derive 32-byte Key via SHA-256 hash
const KEY = crypto.createHash('sha256').update(SECRET).digest();

/**
 * Server-Side AES-256-GCM Encryption for Chat Messages at Rest.
 * Encrypts raw text/payload into ciphertext, IV, and authTag.
 */
export function encryptAtRest(plainText) {
  if (!plainText) return plainText;
  
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  
  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag().toString('hex');

  return {
    ciphertext: encrypted,
    iv: iv.toString('hex'),
    tag: tag,
    isEncryptedAtRest: true,
  };
}

/**
 * Server-Side AES-256-GCM Decryption for Chat Messages at Rest.
 */
export function decryptAtRest(encryptedObj) {
  if (!encryptedObj || typeof encryptedObj !== 'object' || !encryptedObj.isEncryptedAtRest) {
    // If legacy unencrypted string or plain object, return as-is
    return typeof encryptedObj === 'string' ? encryptedObj : encryptedObj?.text || encryptedObj;
  }

  try {
    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      KEY,
      Buffer.from(encryptedObj.iv, 'hex')
    );
    decipher.setAuthTag(Buffer.from(encryptedObj.tag, 'hex'));

    let decrypted = decipher.update(encryptedObj.ciphertext, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('[Encryption-at-Rest Decryption Error]:', error.message);
    return '[Encrypted Content - Decryption Failed]';
  }
}
