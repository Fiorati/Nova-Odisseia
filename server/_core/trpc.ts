import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";
import { hasTrustedMutationOrigin } from "./requestSecurity";
import { VIEW_AS_READ_ONLY_MSG, canUseViewAs, isMutationAllowedWhileViewing } from "@shared/viewAs";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;

const protectBrowserMutation = t.middleware(async opts => {
  if (opts.type === "mutation" && !hasTrustedMutationOrigin(opts.ctx.req)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Origem da requisição não autorizada." });
  }
  if (opts.type === "mutation" && opts.ctx.viewer && !isMutationAllowedWhileViewing(opts.path)) {
    throw new TRPCError({ code: "FORBIDDEN", message: VIEW_AS_READ_ONLY_MSG });
  }
  return opts.next();
});

export const publicProcedure = t.procedure.use(protectBrowserMutation);

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = publicProcedure.use(requireUser);

export const adminProcedure = protectedProcedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== 'admin') {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);

/** Admin real, mesmo quando está vendo a plataforma como outro usuário. */
export const realAdminProcedure = publicProcedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;
    const real = ctx.viewer ?? ctx.user;
    if (!real) throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
    if (real.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    return next({ ctx: { ...ctx, realAdmin: real } });
  }),
);

/** Exclusivo do ADMIN principal (fiorati@novaodisseia.com): usado pelo "ver como usuário". */
export const viewAsOwnerProcedure = publicProcedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;
    const real = ctx.viewer ?? ctx.user;
    if (!real) throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
    if (!canUseViewAs(real)) throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    return next({ ctx: { ...ctx, realAdmin: real } });
  }),
);
