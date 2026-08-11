import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { auth } from "@/lib/auth";
import { isUsageCapPayload } from "@/features/usage/types";

export const createContext = async () => {
	const session = await auth();
	return { session };
};

type Context = Awaited<ReturnType<typeof createContext>>;

const t = initTRPC.context<Context>().create({
	transformer: superjson,
	errorFormatter({ shape, error }) {
		const cause = error.cause;
		return {
			...shape,
			data: {
				...shape.data,
				usageCap: isUsageCapPayload(cause) ? cause : undefined,
			},
		};
	},
});

export const router = t.router;
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
	if (!ctx.session?.user?.id) {
		throw new TRPCError({ code: "UNAUTHORIZED" });
	}
	return next({ ctx: { session: ctx.session } });
});

export const adminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
	const role = String(ctx.session?.user?.userType ?? "");
	if (role.toUpperCase() !== "ADMIN") {
		throw new TRPCError({ code: "FORBIDDEN" });
	}
	return next();
});


