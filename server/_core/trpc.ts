import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    const databaseDetails = `${error.message} ${error.cause instanceof Error ? error.cause.message : ""}`;
    const databaseFailure = /Failed query:|Database is not available|Access denied|ER_ACCESS_DENIED_ERROR|ECONNREFUSED|ECONNRESET|ENOTFOUND|ETIMEDOUT|Unknown database|ER_NO_SUCH_TABLE/i.test(databaseDetails);
    if (error.code !== "INTERNAL_SERVER_ERROR" || !databaseFailure) return shape;

    console.error("[tRPC] Database operation failed; details were withheld from the client.");
    return {
      ...shape,
      message: "Falha ao acessar o banco de dados. Verifique o MySQL, DATABASE_URL e as permissões do usuário local.",
      data: { ...shape.data, stack: undefined },
    };
  },
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

export const adminProcedure = t.procedure.use(
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
