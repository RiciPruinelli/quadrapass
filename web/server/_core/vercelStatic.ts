import type { Express } from "express";
import path from "node:path";

export function serveVercelFrontend(app: Express) {
  const indexFile = path.resolve(process.cwd(), "dist", "public", "index.html");

  app.get("*", (req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD") {
      next();
      return;
    }
    if (req.path === "/api" || req.path.startsWith("/api/")) {
      next();
      return;
    }
    res.sendFile(indexFile, error => {
      if (error) next(error);
    });
  });
}
