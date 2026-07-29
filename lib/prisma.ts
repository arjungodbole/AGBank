import { PrismaClient } from "./generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

// Pasted secrets often carry a stray newline or surrounding whitespace. Those are
// illegal in an HTTP header, so an untrimmed token makes libSQL throw
// `Headers.set: ... is an invalid header value` before it ever reaches Turso.
const readEnv = (name: string) => {
  const raw = process.env[name];
  if (raw === undefined) return undefined;

  const value = raw.trim();
  if (/\s/.test(value)) {
    throw new Error(
      `${name} contains whitespace inside its value. It was probably pasted with a line break — re-copy it as a single line.`
    );
  }
  return value;
};

const url = readEnv("DATABASE_URL");
if (!url) throw new Error("DATABASE_URL is not set.");

const authToken = readEnv("TURSO_AUTH_TOKEN");
if (url.startsWith("libsql://") && !authToken) {
  throw new Error("DATABASE_URL points at Turso but TURSO_AUTH_TOKEN is not set.");
}

// Works with a local file (dev) OR a remote Turso URL (production),
// decided entirely by DATABASE_URL. TURSO_AUTH_TOKEN is only needed for Turso.
const adapter = new PrismaLibSql({ url, authToken });

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
