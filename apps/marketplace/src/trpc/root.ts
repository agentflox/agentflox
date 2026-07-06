import { router } from "@/trpc/init";

import { notificationRouter } from "@/trpc/routers/notification";
import { marketplaceRouter } from "@/trpc/routers/marketplace";

export const appRouter = router({
  notification: notificationRouter,
  marketplace: marketplaceRouter
});

export type AppRouter = typeof appRouter;


