import "dotenv/config";
import express, { type Express } from "express";
import { createServer } from "http";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { applySecurityHeaders, limitSensitiveAuthMutations, rejectUntrustedTrpcMutationOrigin } from "./requestSecurity";
import { serveStatic, setupVite } from "./vite";

export function createApp(): Express {
  const app = express();
  app.disable("x-powered-by");
  app.use(applySecurityHeaders);
  app.use(rejectUntrustedTrpcMutationOrigin);
  app.use(limitSensitiveAuthMutations);
  app.use(express.json({ limit: "18mb" }));
  app.use(express.urlencoded({ limit: "18mb", extended: true }));
  app.get("/healthz", (_req, res) => res.status(200).json({ ok: true }));
  registerStorageProxy(app);
  app.use("/api/trpc", createExpressMiddleware({ router: appRouter, createContext }));
  return app;
}

export async function startServer() {
  const app = createApp();
  const server = createServer(app);
  if (process.env.NODE_ENV === "development") await setupVite(app, server);
  else serveStatic(app);
  const port = Number(process.env.PORT || 3000);
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, () => resolve());
  });
  console.log(`Nova Odisseia running on port ${port}`);
  return server;
}

if (process.env.NOVA_START_SERVER !== "false" && process.env.NODE_ENV !== "test") {
  startServer().catch(error => {
    console.error("Failed to start Nova Odisseia:", error);
    process.exitCode = 1;
  });
}
