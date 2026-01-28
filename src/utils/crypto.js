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

    // Salt (static / env-based, JANGAN dari token itself)
    const saltStr = opts.salt || 'nusa-dpd-salt';

    // 🔑 FAST key derivation (SHA-256)
    // 256-bit key, langsung cocok untuk AES-256
    const key = CryptoJS.SHA256(
      CryptoJS.enc.Utf8.parse(token + saltStr)
    );

    // Random 16-byte IV
    const iv = CryptoJS.lib.WordArray.random(16);

    const encrypted = CryptoJS.AES.encrypt(
      CryptoJS.enc.Utf8.parse(token),
      key,
      {
        iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
      }
    );

    // IV + ciphertext → base64
    const combined = iv.concat(encrypted.ciphertext);
    const b64 = CryptoJS.enc.Base64.stringify(combined);

    return 'v1.aes:' + b64;
  } catch (e) {
    console.error('Error encrypting token for header:', e);
    return token;
  }
}

export default encryptTokenForHeader;
