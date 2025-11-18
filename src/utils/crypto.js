// Lightweight helper using `crypto-js` for encrypting the SSO token for headers.
// Exports `encryptTokenForHeader(token)` which returns a string suitable
// for placing in `X-Api-Token`, e.g. `v1.aes:<base64(iv+ciphertext)>`.
// Note: this implementation uses AES-CBC (via crypto-js). The previous
// implementation used the Web Crypto AES-GCM API. If your server expects
// AES-GCM, adjust accordingly.

import * as CryptoJS from 'crypto-js';

export async function encryptTokenForHeader(token, opts = {}) {
  try {
    if (!token) return '';

    // Salt: prefer explicit option, otherwise derive from token itself
    const saltStr = opts.salt || token || (opts.fallbackSalt || 'nusa-dpd-salt');
    const iterations = opts.iterations || 100000;

    // Derive a 256-bit key (CryptoJS keySize is in 32-bit words: 8 words = 256 bits)
    const key = CryptoJS.PBKDF2(token, CryptoJS.enc.Utf8.parse(saltStr), {
      keySize: 8,
      iterations,
      hasher: CryptoJS.algo.SHA256,
    });

    // Use a random 16-byte IV for AES-CBC
    const iv = CryptoJS.lib.WordArray.random(16);

    const encrypted = CryptoJS.AES.encrypt(CryptoJS.enc.Utf8.parse(token), key, {
      iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });

    // Prepend IV to ciphertext and base64 encode
    const combined = iv.concat(encrypted.ciphertext);
    const b64 = CryptoJS.enc.Base64.stringify(combined);
    return 'v1.aes:' + b64;
  } catch (e) {
    // On error, return raw token for compatibility with callers
    console.error('Error encrypting token for header (crypto-js):', e);
    return token;
  }
}

export default encryptTokenForHeader;
