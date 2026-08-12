import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';

const KEY_DIR = path.join(app.getPath('userData'), 'device-security');
const PRIVATE_KEY_PATH = path.join(KEY_DIR, 'device_private.pem');
const PUBLIC_KEY_PATH = path.join(KEY_DIR, 'device_public.pem');

// Note: In a true production environment, `keytar` or native Windows DPAPI/TPM
// should be used to protect this private key at rest instead of the filesystem.

export async function generateDeviceKeyPair(): Promise<{ privateKey: string, publicKey: string }> {
  return new Promise((resolve, reject) => {
    crypto.generateKeyPair('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem'
      }
    }, (err, publicKey, privateKey) => {
      if (err) reject(err);
      else resolve({ publicKey, privateKey });
    });
  });
}

export async function storePrivateKey(privateKey: string): Promise<void> {
  if (!fs.existsSync(KEY_DIR)) {
    fs.mkdirSync(KEY_DIR, { recursive: true });
  }
  // Store securely. For this prototype, we write to the OS-protected UserData directory.
  fs.writeFileSync(PRIVATE_KEY_PATH, privateKey, { mode: 0o600 });
}

export async function getPublicKey(): Promise<string> {
  // If the public key isn't stored separately, we can derive it from the private key
  const privateKeyPem = fs.readFileSync(PRIVATE_KEY_PATH, 'utf8');
  const privateKey = crypto.createPrivateKey(privateKeyPem);
  const publicKey = crypto.createPublicKey(privateKey);
  return publicKey.export({ type: 'spki', format: 'pem' }).toString();
}

export async function signChallenge(challenge: string): Promise<string> {
  const privateKeyPem = fs.readFileSync(PRIVATE_KEY_PATH, 'utf8');
  const sign = crypto.createSign('SHA256');
  sign.update(challenge);
  sign.end();
  const signature = sign.sign(privateKeyPem, 'base64');
  return signature;
}

export async function hasPrivateKey(): Promise<boolean> {
  return fs.existsSync(PRIVATE_KEY_PATH);
}
