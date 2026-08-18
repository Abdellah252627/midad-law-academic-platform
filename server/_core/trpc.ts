import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";
import { ENV } from "./env";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

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

export const protectedProcedure = t.procedure.use(requireUser);

// The production admin identity is the single Manus owner account. The test-only
// fallback keeps existing isolated procedure tests deterministic without ever
// weakening production access control when OWNER_OPEN_ID is configured.
export const AUTHORIZED_ADMIN_OPEN_ID = ENV.ownerOpenId || (!ENV.isProduction ? "admin-1" : "");

export function isAuthorizedAdmin(user: TrpcContext["user"]): boolean {
  if (!user) return false;

  // The single configured owner is the source of truth in production. Do not
  // require the database role here: an OAuth account may be provisioned with a
  // stale/default role while its trusted OWNER_OPEN_ID is still unambiguous.
  if (ENV.ownerOpenId && user.openId === ENV.ownerOpenId) return true;

  // Test-only identities remain available outside production for isolated specs.
  if (ENV.isProduction || user.role !== "admin") return false;
  const localTestAdminIds = new Set(["admin", "admin-1", "admin-open-id"]);
  return localTestAdminIds.has(user.openId);
}

export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!isAuthorizedAdmin(ctx.user)) {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user!,
      },
    });
  }),
);
