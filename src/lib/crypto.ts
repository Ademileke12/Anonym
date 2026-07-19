import { createHash, createHmac } from "crypto";

export function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

export function hmacSha256(secret: string, message: string): string {
  return createHmac("sha256", secret).update(message).digest("hex");
}

export function generateRandomHex(bytes: number): string {
  const chars = "0123456789abcdef";
  let result = "0x";
  for (let i = 0; i < bytes * 2; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
