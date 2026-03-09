import { z } from "zod";
import { protectedProcedure, router } from "@/trpc/init";
import { prisma } from "@/lib/prisma";

export const onboardingRouter = router({
	get: protectedProcedure.query(async ({ ctx }) => {
		const userId = ctx.session!.user!.id;
		const user = await prisma.user.findUnique({
			where: { id: userId },
			select: {
				onboardingCompleted: true,
				onboardingStep: true,
				name: true,
				role: true,
				usagePurpose: true,
				managementGoals: true,
				referralSource: true
			},
		});
		return user;
	}),

	update: protectedProcedure
		.input(
			z.object({
				completed: z.boolean().optional(),
				step: z.number().int().min(0).max(10).optional(),
				name: z.string().optional(),
				role: z.string().optional(),
				usagePurpose: z.string().optional(),
				managementGoals: z.array(z.string()).optional(),
				referralSource: z.string().optional(),
			})
		)
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session!.user!.id;
			const updated = await prisma.user.update({
				where: { id: userId },
				data: {
					onboardingCompleted: input.completed ?? undefined,
					onboardingStep: input.step ?? undefined,
					name: input.name ?? undefined,
					role: input.role ?? undefined,
					usagePurpose: input.usagePurpose ?? undefined,
					managementGoals: input.managementGoals ?? undefined,
					referralSource: input.referralSource ?? undefined,
				},
				select: {
					onboardingCompleted: true,
					onboardingStep: true,
					name: true,
					role: true,
					usagePurpose: true,
					managementGoals: true,
					referralSource: true
				},
			});
			return updated;
		}),
});


