// File: services/auth-service/backend/src/auth/jwt/keys.util.ts
import { createPublicKey } from 'crypto';
import * as fs from 'fs';

export function loadPrivateKey(): string {
  const pem = process.env.JWT_PRIVATE_KEY;
  const path = process.env.JWT_PRIVATE_KEY_PATH;
  if (pem) return fixPem(pem);
  if (path) return fs.readFileSync(path, 'utf8');
  throw new Error('JWT_PRIVATE_KEY or JWT_PRIVATE_KEY_PATH is required');
}

export function loadPublicKey(): string {
  const pem = process.env.JWT_PUBLIC_KEY;
  const path = process.env.JWT_PUBLIC_KEY_PATH;
  if (pem) return fixPem(pem);
  if (path) return fs.readFileSync(path, 'utf8');
  throw new Error('JWT_PUBLIC_KEY or JWT_PUBLIC_KEY_PATH is required');
}

function fixPem(s: string) {
  // Support \n in .env
  return s.includes('\\n') ? s.replace(/\\n/g, '\n') : s;
}

export function publicKeyToJwk(): any {
  const pubPem = loadPublicKey();
  // Let Node parse; we’ll export in SPKI.
  const keyObj = createPublicKey(pubPem);
  const spki = keyObj.export({ type: 'spki', format: 'der' }) as Buffer;

  // Minimal JWK builder for RSA (n,e) via ASN.1 parsing is verbose.
  // Simpler: use jose library in future. For now, provide a single key with kid.
  // We’ll compute kid as a short hash of the PEM.
  const kid = makeKid(pubPem);
  // NOTE: This is a simplified JWKS entry: many validators accept x5c/x5t or full n/e.
  // For production-grade JWKS with n/e, switch to `jose` for exact JWK export.
  return {
    keys: [
      {
        kty: 'RSA',
        alg: 'RS256',
        use: 'sig',
        kid,
        // x5c/x5t omitted in this minimalist version.
        // If your other services use jose, we’ll upgrade this in the next pass.
      },
    ],
  };
}

function makeKid(pem: string) {
  const clean = pem.replace(/\s+/g, '');
  let h = 0;
  for (let i = 0; i < clean.length; i++) h = (h * 31 + clean.charCodeAt(i)) | 0;
  return 'kid-' + Math.abs(h);
}
