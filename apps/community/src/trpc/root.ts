import { router } from "@/trpc/init";

import { userRouter } from "@/trpc/routers/user";
import { profileRouter } from "@/trpc/routers/profile";
import { notificationRouter } from "@/trpc/routers/notification";
import { postsRouter } from "@/trpc/routers/posts";
import { commentsRouter } from "@/trpc/routers/comments";
import { logsRouter } from "@/trpc/routers/logs";
import { discussionsRouter } from "@/trpc/routers/discussions";
import { chatRouter } from "@/trpc/routers/chat"
import { communityGroupRouter } from "@/trpc/routers/communityGroup";
import { adminRouter } from "@/trpc/routers/admin";

export const appRouter = router({
  user: userRouter,
  profile: profileRouter,
  notification: notificationRouter,
  posts: postsRouter,
  comments: commentsRouter,
  logs: logsRouter,
  discussions: discussionsRouter,
  chat: chatRouter,
  communityGroup: communityGroupRouter,
  admin: adminRouter
});

export type AppRouter = typeof appRouter;


