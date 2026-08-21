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
// البريد الموثوق للحساب الإداري الوحيد الذي حدده مالك المنصة.
export const AUTHORIZED_ADMIN_EMAIL = "abdellahmr538@gmail.com";

export function isPlatformOwner(user: TrpcContext["user"]): boolean {
  if (!user) return false;
  if (ENV.ownerOpenId && user.openId === ENV.ownerOpenId) return true;
  if (user.email?.trim().toLowerCase() === AUTHORIZED_ADMIN_EMAIL) return true;
  if (ENV.isProduction) return false;
  return user.role === "admin" && new Set(["admin", "admin-1", "admin-open-id"]).has(user.openId);
}

export function isAuthorizedAdmin(user: TrpcContext["user"]): boolean {
  if (!user) return false;

  // OpenID هو المعيار الأقوى عند توفره في بيئة النشر.
  if (isPlatformOwner(user)) return true;
  // يسمح هذا بالاسترداد الآمن إذا تغير OpenID التقني مع بقاء بريد OAuth الموثق.

  // هويات الاختبار متاحة خارج الإنتاج فقط لاختبارات الإجراءات المعزولة.
  if (ENV.isProduction || user.role !== "admin") return false;
  const localTestAdminIds = new Set(["admin", "admin-1", "admin-open-id"]);
  return localTestAdminIds.has(user.openId);
}

export const ownerProcedure = protectedProcedure.use(
  t.middleware(async opts => {
    if (!isPlatformOwner(opts.ctx.user)) {
      throw new TRPCError({ code: "FORBIDDEN", message: "هذا الإجراء متاح لمالك المنصة فقط" });
    }
    return opts.next({ ctx: { ...opts.ctx, user: opts.ctx.user! } });
  }),
);

export const adminProcedure = protectedProcedure.use(
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
