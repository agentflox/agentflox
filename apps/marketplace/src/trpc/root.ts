import { router } from "@/trpc/init";

import { notificationRouter } from "@/trpc/routers/notification";
import { marketplaceRouter } from "@/trpc/routers/marketplace";
import { commentsRouter } from "@/trpc/routers/comments";

export const appRouter = router({
  notification: notificationRouter,
  marketplace: marketplaceRouter,
  comments: commentsRouter
});

export type AppRouter = typeof appRouter;


