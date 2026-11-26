import { createExpressMiddleware } from "@trpc/server/adapters/express";
import express, { type ErrorRequestHandler } from "express";
import { sql } from "drizzle-orm";
import { existsSync } from "node:fs";
import path from "node:path";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { getDb } from "../db";
import { isLocalAdminRequest, registerLocalAdminRoutes } from "./localAdmin";
import { registerLocalExpoWebCors } from "./localDevCors";
import { registerOAuthRoutes } from "./oauth";
import { publicPlatformScript } from "./publicConfig";

export function createApp() {
  const app = express();

  registerLocalExpoWebCors(app);
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
  app.get("/api/health/ready", async (_req, res) => {
    try {
      const db = await getDb();
      if (!db) {
        res.status(503).json({ status: "not_ready", database: "unavailable" });
        return;
      }
      await db.execute(sql`select 1`);
      res.json({ status: "ready", database: "ok" });
    } catch (error) {
      console.error(
        "[Health] Database readiness check failed:",
        error instanceof Error ? error.message : "unknown error",
      );
      res.status(503).json({ status: "not_ready", database: "unavailable" });
    }
  });
  app.get("/api/platform/config.js", (req, res) => {
    res
      .set("Cache-Control", "no-store")
      .type("application/javascript")
      .send(publicPlatformScript(process.env, isLocalAdminRequest(req)));
  });
  app.get("/manus-routes.json", (_req, res, next) => {
    const candidates = [
      path.resolve(process.cwd(), "public", "manus-routes.json"),
      path.resolve(process.cwd(), "dist", "public", "manus-routes.json"),
    ];
    const manifest = candidates.find(candidate => existsSync(candidate));
    if (!manifest) {
      res.status(404).json({ message: "Route manifest unavailable" });
      return;
    }
    res.type("application/json").sendFile(manifest, error => {
      if (error) next(error);
    });
  });

  registerOAuthRoutes(app);
  registerLocalAdminRoutes(app);
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    }),
  );
  app.use("/api", (_req, res) => res.status(404).json({ message: "API route not found" }));

  const errorHandler: ErrorRequestHandler = (error, _req, res, next) => {
    if (res.headersSent) {
      next(error);
      return;
    }
    const message = error instanceof Error ? error.message : "Unknown server error";
    console.error("[HTTP] Request failed:", message);
    res.status(500).json({
      message: process.env.NODE_ENV === "development" ? message : "Internal server error",
    });
  };
  app.use(errorHandler);

  return app;
}
