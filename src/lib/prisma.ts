import { PrismaClient } from "@prisma/client";
import path from "path";
import fs from "fs";

// Pragmatic Hackathon Pattern: Global singleton to prevent connection leaks during Next.js fast-refresh
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function getPrismaClient(): PrismaClient {
  if (globalForPrisma.prisma) {
    return globalForPrisma.prisma;
  }

  let dbUrl = process.env.DATABASE_URL;

  // On Vercel serverless functions, the root filesystem is read-only.
  // Copy the pre-seeded SQLite database to /tmp/dev.db so write transactions succeed without errors.
  if (process.env.VERCEL) {
    const tmpDbPath = "/tmp/dev.db";
    const srcDbPath = path.join(process.cwd(), "prisma", "dev.db");
    try {
      if (!fs.existsSync(tmpDbPath) && fs.existsSync(srcDbPath)) {
        fs.copyFileSync(srcDbPath, tmpDbPath);
      }
    } catch (err) {
      console.error("Failed to sync dev.db to /tmp:", err);
    }
    dbUrl = "file:/tmp/dev.db";
  }

  const client = new PrismaClient({
    datasources: dbUrl ? { db: { url: dbUrl } } : undefined,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = client;
  }

  return client;
}

export const prisma = getPrismaClient();
export default prisma;
