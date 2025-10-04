/**
 * Linkvertise Client - Link generator with RSA-OAEP encryption
 * Generates Linkvertise links using RSA encryption
 * @module linkvertise-client
 */

const crypto = require('crypto');

// Linkvertise public key for encryption
const LINKVERTISE_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA1piHDY9WRIehbfC3Fpol
Ly/WrJF8TKFVdDMobj3fkNjN/69dTv9JgXt+gcJxVn/h4NCMtQ2mCQXNBMXzLOky
HJipiFMoyPtOOlMlbWRAiaQE1GpMebGNRcsxYnWzF53v63+hUQgrMahH9X0Ii/NJ
hvDyFlPX77+z9xiyd45L+xrgayePpOxvQpj6VJDlpNNKWbuIkFvkMmUVRM2TLulL
JSgs4EgoBZgTYRpmhgR8tYfDOW+cOctffggcMAzKUC2CzYNmhzX15O7DKaZdYgfa
BR/hqvyNAxBepHOJnBfHkQqaox5diHGqdwXXLwiJKzoK5R26vaI3jg2+d69VPSGL
0QIDAQAB
-----END PUBLIC KEY-----`;

class LinkvertiseClient {
  constructor(options = {}) {
    this.linkvertise_url = options.base_url || "https://link-to.net";
    this.user_id = options.user_id || null;
    this.publicKey = this._loadPublicKey();
  }

  _loadPublicKey() {
    // Remove headers, footers, and whitespace
    const pemContents = LINKVERTISE_PUBLIC_KEY
      .replace('-----BEGIN PUBLIC KEY-----', '')
      .replace('-----END PUBLIC KEY-----', '')
      .replace(/\s+/g, '');
    
    return crypto.createPublicKey({
      key: Buffer.from(pemContents, 'base64'),
      format: 'der',
      type: 'spki'
    });
  }

  encryptUrl(url) {
    // Encrypt using RSA-OAEP with SHA-256
    const encryptedBuffer = crypto.publicEncrypt(
      {
        key: this.publicKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256'
      },
      Buffer.from(url, 'utf8')
    );

    return encryptedBuffer.toString('base64');
  }

  linkvertise(user_id, link) {
    const userId = user_id || this.user_id;
    
    if (!userId) {
      throw new Error('User ID is required for generating Linkvertise links');
    }

    const randomValue = Math.floor(Math.random() * 1000);
    const encryptedLink = this.encryptUrl(link);
    
    const href = `${this.linkvertise_url}/${userId}/${randomValue}/dynamic/?r=${encryptedLink}&v=2`;
    return href;
  }

  generateCallbackUrl(domain, userId, token) {
    return `${domain}/linkvertise/callback?user_id=${userId}&token=${token}`;
  }
}

module.exports = LinkvertiseClient;
