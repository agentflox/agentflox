import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { auth } from "@/lib/auth";

export const createContext = async () => {
	const session = await auth();
	return { session };
};

type Context = Awaited<ReturnType<typeof createContext>>;

const t = initTRPC.context<Context>().create({
	transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
	if (!ctx.session?.user?.id) {
		throw new TRPCError({ code: "UNAUTHORIZED" });
	}
	return next({ ctx: { session: ctx.session } });
});


