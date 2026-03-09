import { router } from "@/trpc/init";
import { proposalRouter } from "@/trpc/routers/proposal";
import { projectRouter } from "@/trpc/routers/project";
import { teamRouter } from "@/trpc/routers/team";
import { requestRouter } from "@/trpc/routers/request";
import { userRouter } from "@/trpc/routers/user";
import { profileRouter } from "@/trpc/routers/profile";
import { onboardingRouter } from "@/trpc/routers/onboarding";
import { notificationRouter } from "@/trpc/routers/notification";
import { postsRouter } from "@/trpc/routers/posts";
import { commentsRouter } from "@/trpc/routers/comments";
import { logsRouter } from "@/trpc/routers/logs";
import { discussionsRouter } from "@/trpc/routers/discussions";
import { billingRouter } from "@/trpc/routers/billing";
import { usageRouter } from "@/trpc/routers/usage";
import { messagesRouter } from "@/trpc/routers/messages";
import { connectionsRouter } from "@/trpc/routers/connections";
import { chatRouter } from "@/trpc/routers/chat"
import { workspaceRouter } from "@/trpc/routers/workspace";
import { spaceRouter } from "@/trpc/routers/space";
import { channelRouter } from "@/trpc/routers/channel";
import { channelMessageRouter } from "@/trpc/routers/channelMessage";
import { taskRouter } from "@/trpc/routers/task";
import { materialRouter } from "@/trpc/routers/material";
import { toolRouter } from "@/trpc/routers/tool";
import { resourceRouter } from "@/trpc/routers/resource";
import { marketplaceRouter } from "@/trpc/routers/marketplace";
import { payoutRouter } from "@/trpc/routers/payout";
import { listRouter } from "@/trpc/routers/list";
import { folderRouter } from "@/trpc/routers/folder";
import { agentRouter } from "@/trpc/routers/agent";
import { documentRouter } from "@/trpc/routers/document";
import { documentActivityRouter } from "@/trpc/routers/documentActivity";
import { organizationRouter } from "@/trpc/routers/organization";
import { viewRouter } from "@/trpc/routers/view";
import { customFieldsRouter } from "@/trpc/routers/customFields";
import { integrationRouter } from "@/trpc/routers/integration";
import { workforceRouter } from "@/trpc/routers/workforce";
import { compositeToolRouter } from "@/trpc/routers/compositeTool";

export const appRouter = router({
  proposal: proposalRouter,
  project: projectRouter,
  team: teamRouter,
  request: requestRouter,
  user: userRouter,
  profile: profileRouter,
  onboarding: onboardingRouter,
  notification: notificationRouter,
  posts: postsRouter,
  comments: commentsRouter,
  logs: logsRouter,
  discussions: discussionsRouter,
  billing: billingRouter,
  usage: usageRouter,
  messages: messagesRouter,
  connections: connectionsRouter,
  chat: chatRouter,
  workspace: workspaceRouter,
  space: spaceRouter,
  channel: channelRouter,
  channelMessage: channelMessageRouter,
  task: taskRouter,
  material: materialRouter,
  tool: toolRouter,
  marketplace: marketplaceRouter,
  payout: payoutRouter,
  resource: resourceRouter,
  list: listRouter,
  folder: folderRouter,
  agent: agentRouter,
  document: documentRouter,
  documentActivity: documentActivityRouter,
  organization: organizationRouter,
  view: viewRouter,
  customFields: customFieldsRouter,
  integration: integrationRouter,
  workforce: workforceRouter,
  compositeTool: compositeToolRouter,
});

export type AppRouter = typeof appRouter;


