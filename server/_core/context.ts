import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { VIEW_AS_HEADER, resolveViewAs } from "@shared/viewAs";
import { getUserById } from "../viewAsDb";
import { authenticateRequest } from "./session";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
  /** Admin real quando está usando "ver como usuário"; null na navegação normal. */
  viewer?: User | null;
};

export async function createContext(opts: CreateExpressContextOptions): Promise<TrpcContext> {
  let user: User | null = null;
  try { user = await authenticateRequest(opts.req); } catch { user = null; }
  let viewer: User | null = null;
  try {
    const resolved = await resolveViewAs(user, opts.req.headers?.[VIEW_AS_HEADER], getUserById);
    user = resolved.user;
    viewer = resolved.viewer;
  } catch {
    viewer = null;
  }
  return { req: opts.req, res: opts.res, user, viewer };
}
