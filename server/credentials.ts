import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";

export function normalizedEmail(email: string) {
  return email.trim().toLowerCase();
}

function derivePassword(password: string, passwordSalt: string) {
  return new Promise<Buffer>((resolve, reject) => {
    scryptCallback(password, passwordSalt, 64, (error, value) => {
      if (error) reject(error);
      else resolve(value as Buffer);
    });
  });
}

export async function createPassword(password: string) {
  const passwordSalt = randomBytes(16).toString("hex");
  const passwordHash = (await derivePassword(password, passwordSalt)).toString("hex");
  return { passwordHash, passwordSalt };
}

export async function verifyPassword(password: string, passwordSalt: string, passwordHash: string) {
  const calculated = await derivePassword(password, passwordSalt);
  const stored = Buffer.from(passwordHash, "hex");
  return stored.length === calculated.length && timingSafeEqual(stored, calculated);
}
