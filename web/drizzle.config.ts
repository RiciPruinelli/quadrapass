import "dotenv/config";
import { defineConfig } from "drizzle-kit";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required to run drizzle commands");
}

const tlsSetting = process.env.TIDB_ENABLE_SSL?.toLowerCase();
const useSSL = tlsSetting === "true" || (tlsSetting !== "false" && process.env.VERCEL === "1");
const caBase64 = process.env.TIDB_CA_CERT_BASE64?.trim();
const ssl = useSSL
  ? {
      minVersion: "TLSv1.2" as const,
      rejectUnauthorized: true,
      ...(caBase64 ? { ca: Buffer.from(caBase64, "base64") } : {}),
    }
  : undefined;

export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle",
  dialect: "mysql",
  dbCredentials: {
    url: connectionString,
    ...(ssl ? { ssl } : {}),
  },
});
