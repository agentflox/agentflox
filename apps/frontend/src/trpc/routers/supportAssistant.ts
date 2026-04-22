import { z } from "zod";
import { protectedProcedure, router } from "@/trpc/init";
import { initializeSupportAssistant, sendMessageToSupportAssistant } from "@/services/supportAssistant.service";

const initializeSchema = z.object({
  title: z.string().optional(),
});

const messageSchema = z.object({
  conversationId: z.string().min(1),
  message: z.string().min(1),
});

export const supportAssistantRouter = router({
  initialize: protectedProcedure.input(initializeSchema).mutation(async ({ ctx, input }) => {
    return initializeSupportAssistant(ctx.session.user.id, input.title);
  }),

  message: protectedProcedure.input(messageSchema).mutation(async ({ ctx, input }) => {
    return sendMessageToSupportAssistant(ctx.session.user.id, input.conversationId, input.message);
  }),
});

